// Draws WHISPERS tickets as 1080×1920 images and saves them to the device.
// Used by index.html (after the RSVP) and /ticket/:token. Needs the qrcode library.
// iOS only opens the share sheet from a tap, so call prepare() first and save() on the tap.
(function () {
  const W = 1080, H = 1920;
  const SERIF = "'Cormorant Garamond', Georgia, serif";
  const SANS = "'Jost', 'Helvetica Neue', Arial, sans-serif";
  const GOLD = "#D9AE78", GOLD_HI = "#EBCB95", BONE = "#F4EDE2", MUTE = "#BDB2A5";

  function loadImage(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  function spaced(ctx, text, x, y, spacing) {
    const chars = [...text];
    const width = chars.reduce((w, c) => w + ctx.measureText(c).width, 0) + spacing * (chars.length - 1);
    let cx = x - width / 2;
    for (const c of chars) {
      ctx.fillText(c, cx + ctx.measureText(c).width / 2, y);
      cx += ctx.measureText(c).width + spacing;
    }
  }

  function fit(ctx, text, font, size, maxWidth) {
    let s = size;
    do { ctx.font = font.replace("{s}", s); s -= 2; } while (ctx.measureText(text).width > maxWidth && s > 30);
  }

  function wrap(ctx, text, maxWidth) {
    const words = String(text).split(/\s+/), lines = [];
    let line = "";
    for (const w of words) {
      const next = line ? line + " " + w : w;
      if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = w; } else line = next;
    }
    if (line) lines.push(line);
    return lines;
  }

  function rule(ctx, y) {
    const g = ctx.createLinearGradient(W / 2 - 90, 0, W / 2 + 90, 0);
    g.addColorStop(0, "rgba(217,174,120,0)"); g.addColorStop(.5, "rgba(217,174,120,.9)"); g.addColorStop(1, "rgba(217,174,120,0)");
    ctx.fillStyle = g; ctx.fillRect(W / 2 - 90, y, 180, 2);
    ctx.save(); ctx.translate(W / 2, y + 1); ctx.rotate(Math.PI / 4); ctx.fillStyle = GOLD; ctx.fillRect(-5, -5, 10, 10); ctx.restore();
  }

  async function qrCanvas(url) {
    const c = document.createElement("canvas");
    await window.QRCode.toCanvas(c, url, { width: 560, margin: 1, color: { dark: "#0B0908", light: "#F1E9DC" } });
    return c;
  }

  // t = { name, role, sealCode, url, lines: [..], note }
  async function draw(t, art) {
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";

    ctx.fillStyle = "#070605"; ctx.fillRect(0, 0, W, H);
    let g = ctx.createRadialGradient(W / 2, 520, 0, W / 2, 520, 900);
    g.addColorStop(0, "rgba(120,78,36,.34)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(W / 2, H + 200, 0, W / 2, H + 200, 1100);
    g.addColorStop(0, "rgba(110,12,22,.5)"); g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (art.rose) { ctx.globalAlpha = .07; ctx.drawImage(art.rose, -160, 520, 1400, 1400); ctx.globalAlpha = 1; }

    if (art.mark) ctx.drawImage(art.mark, W / 2 - 85, 120, 170, 170);
    ctx.fillStyle = GOLD; ctx.font = `300 50px ${SERIF}`;
    spaced(ctx, "WHISPERS", W / 2, 372, 22);
    ctx.fillStyle = "rgba(217,174,120,.7)"; ctx.fillRect(W / 2 - 50, 408, 100, 2);

    ctx.fillStyle = BONE; fit(ctx, t.name, `300 {s}px ${SERIF}`, 104, W - 160);
    ctx.fillText(t.name, W / 2, 540);
    ctx.fillStyle = "#CDB894"; ctx.font = `italic 400 46px ${SERIF}`;
    ctx.fillText(t.role, W / 2, 610);
    rule(ctx, 668);

    ctx.fillStyle = GOLD_HI; ctx.font = `300 52px ${SANS}`;
    spaced(ctx, t.sealCode || "WSP·10", W / 2, 770, 12);

    const qr = await qrCanvas(t.url);
    ctx.fillStyle = "#F1E9DC"; ctx.fillRect(W / 2 - 300, 830, 600, 600);
    ctx.drawImage(qr, W / 2 - 280, 850, 560, 560);

    ctx.fillStyle = "rgba(217,174,120,.3)"; ctx.fillRect(110, 1500, W - 220, 2);
    ctx.font = `400 44px ${SERIF}`;
    let y = 1572;
    for (const line of t.lines) {
      for (const part of wrap(ctx, line, W - 200)) {
        ctx.fillStyle = BONE; ctx.fillText(part, W / 2, y); y += 58;
      }
    }
    if (t.note) {
      ctx.fillStyle = MUTE; ctx.font = `italic 400 38px ${SERIF}`;
      ctx.fillText(t.note, W / 2, Math.min(y + 30, H - 70));
    }
    return c;
  }

  function toFile(canvas, name) {
    return new Promise((resolve) => canvas.toBlob((b) => resolve(new File([b], name, { type: "image/png" })), "image/png"));
  }

  function slug(s) {
    return String(s).normalize("NFKD").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "guest";
  }

  async function prepare(tickets) {
    if (!window.QRCode) throw new Error("QR library missing");
    try { await Promise.all([document.fonts.load(`300 104px ${SERIF}`), document.fonts.load(`italic 400 46px ${SERIF}`), document.fonts.load(`300 52px ${SANS}`)]); } catch (_) {}
    const [mark, rose] = await Promise.all([loadImage("/assets/whispers-mark.png"), loadImage("/assets/whispers-rose.png")]);
    const files = [];
    for (const t of tickets) files.push(await toFile(await draw(t, { mark, rose }), `whispers-ticket-${slug(t.name)}.png`));
    return files;
  }

  function download(files) {
    files.forEach((file, i) => setTimeout(() => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(file); a.download = file.name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, i * 400));
  }

  // Returns "shared", "downloaded" or "cancelled".
  async function save(files) {
    // Phones: the share sheet ("Save Image" to Photos). Computers: a plain download.
    const touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (touch && navigator.canShare && navigator.canShare({ files })) {
      try { await navigator.share({ files, title: "WHISPERS" }); return "shared"; }
      catch (e) { if (e && e.name === "AbortError") return "cancelled"; }
    }
    download(files);
    return "downloaded";
  }

  window.WhispersTickets = { prepare, save };
})();
