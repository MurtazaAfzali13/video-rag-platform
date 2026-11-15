const PAGE = { width: 210, height: 297 } as const; // A4, mm
const MARGIN = { top: 18, right: 18, bottom: 20, left: 18 } as const;
const CONTENT_W = PAGE.width - MARGIN.left - MARGIN.right; // 174mm
const CONTENT_H = PAGE.height - MARGIN.top - MARGIN.bottom; // 259mm

const BLOCK_ATTR = "data-pdf-block";
const KEEP_NEXT_ATTR = "data-pdf-keep-next";
const RENDER_SCALE = 3; // ~288 dpi
const EPS = 0.5;

interface Unit {
  top: number;
  bottom: number;
  keepNext: boolean;
}
interface PageSlice {
  start: number;
  end: number;
}
interface LinkBox {
  href: string;
  left: number;
  top: number;
  bottom: number;
  width: number;
}

export interface RenderPdfOptions {
  title: string;
  fileName: string;
}

/** Unbreakable units = outermost [data-pdf-block] that fit on a page; taller ones are split into children. */
function collectUnits(root: HTMLElement, rootTop: number, maxHeight: number): Unit[] {
  const units: Unit[] = [];

  const walk = (node: Element): boolean => {
    let found = false;
    for (const child of Array.from(node.children)) {
      if (child instanceof HTMLElement && child.hasAttribute(BLOCK_ATTR)) {
        const r = child.getBoundingClientRect();
        const unit: Unit = {
          top: r.top - rootTop,
          bottom: r.bottom - rootTop,
          keepNext: child.hasAttribute(KEEP_NEXT_ATTR),
        };
        if (unit.bottom - unit.top <= maxHeight || !walk(child)) units.push(unit);
        found = true;
        continue;
      }
      if (walk(child)) found = true;
    }
    return found;
  };

  walk(root);
  return units.sort((a, b) => a.top - b.top);
}

function paginate(units: Unit[], total: number, pageHeight: number): PageSlice[] {
  const pages: PageSlice[] = [];
  let y = 0;

  while (y < total - 2) {
    const limit = y + pageHeight;
    if (limit >= total - EPS) {
      pages.push({ start: y, end: total });
      break;
    }

    const first = units.findIndex((u) => u.bottom > y + 1);
    if (first === -1) {
      pages.push({ start: y, end: limit });
      y = limit;
      continue;
    }

    let last = first - 1;
    for (let i = first; i < units.length && units[i].bottom <= limit + EPS; i++) last = i;

    // Nothing fits entirely (block taller than a page) -> hard cut.
    if (last < first) {
      pages.push({ start: y, end: limit });
      y = limit;
      continue;
    }

    // Never leave a heading alone at the bottom of a page.
    while (last > first && units[last].keepNext) last--;

    const end = units[last].bottom;
    pages.push({ start: y, end });
    y = units[last + 1]?.top ?? end; // skip the inter-block gap
  }

  return pages;
}

function collectLinks(root: HTMLElement, rootRect: DOMRect): LinkBox[] {
  return Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href]"))
    .filter((a) => /^https?:/i.test(a.href))
    .map((a) => {
      const r = a.getBoundingClientRect();
      return {
        href: a.href,
        left: r.left - rootRect.left,
        top: r.top - rootRect.top,
        bottom: r.bottom - rootRect.top,
        width: r.width,
      };
    });
}

export async function renderElementToPdf(
  element: HTMLElement,
  { title, fileName }: RenderPdfOptions
): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas-pro"),
    import("jspdf"),
  ]);

  const rootRect = element.getBoundingClientRect();
  const widthPx = Math.ceil(rootRect.width);
  const heightPx = Math.ceil(rootRect.height);
  const mmPerPx = CONTENT_W / rootRect.width;
  const pageHeightPx = CONTENT_H / mmPerPx;

  // 1) Measure the layout and decide page breaks BEFORE rasterising.
  const units = collectUnits(element, rootRect.top, pageHeightPx);
  const pages = paginate(units, heightPx, pageHeightPx);
  const links = collectLinks(element, rootRect);

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  pdf.setProperties({ title, creator: "YouTube Video RAG" });

  // 2) Rasterise every page on its own: no giant canvas, no slicing,
  //    so styling is identical on every page.
  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];
    if (index > 0) pdf.addPage();

    const startPx = Math.floor(page.start);
    const sliceHeightPx = Math.max(1, Math.ceil(page.end) - startPx);

    const canvas = await html2canvas(element, {
      scale: RENDER_SCALE,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      scrollX: 0,
      scrollY: 0,
      x: 0,
      y: startPx, // crop window, relative to the element
      width: widthPx,
      height: sliceHeightPx,
    });

    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      MARGIN.left,
      MARGIN.top,
      CONTENT_W,
      sliceHeightPx * mmPerPx,
      undefined,
      "FAST"
    );

    // Clickable timestamps that belong to this page
    for (const link of links) {
      if (link.top >= startPx - EPS && link.bottom <= page.end + EPS) {
        pdf.link(
          MARGIN.left + link.left * mmPerPx,
          MARGIN.top + (link.top - startPx) * mmPerPx,
          link.width * mmPerPx,
          (link.bottom - link.top) * mmPerPx,
          { url: link.href }
        );
      }
    }

    canvas.width = 0;
    canvas.height = 0; // release memory early
  }

  // 3) Footer on every page (ASCII only: jsPDF built-in fonts have no Persian glyphs)
  const total = pdf.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    pdf.setPage(i);
    pdf.setDrawColor(227, 230, 243);
    pdf.setLineWidth(0.2);
    pdf.line(MARGIN.left, PAGE.height - 12, PAGE.width - MARGIN.right, PAGE.height - 12);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(120, 128, 160);
    pdf.text("YouTube Video RAG", MARGIN.left, PAGE.height - 7.5);
    pdf.text(`${i} / ${total}`, PAGE.width - MARGIN.right, PAGE.height - 7.5, { align: "right" });
  }

  pdf.save(fileName);
}