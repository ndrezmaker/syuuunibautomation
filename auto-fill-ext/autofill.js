(async () => {
  if (window.__autofillRunning) { console.warn("Automation sedang berjalan"); return; }
  window.__autofillRunning = true;

  // ===== KONFIGURASI =====
  const STATUS = "Good";
  // {name} diganti otomatis dengan nama komponen/section
  // Dipilih acak untuk tiap section (tidak sama dengan section sebelumnya)
  const REMARK_TEMPLATES = [
    "ok untuk komponen {name} sudah sesuai dan bagus",
    "komponen {name} sudah sesuai dan baik",
    "untuk komponen {name} sudah tepat dan bagus",
    "ok, komponen {name} sudah sesuai dan memadai",
    "komponen {name} sudah sesuai standar dan bagus",
    "secara keseluruhan komponen {name} sudah baik dan sesuai",
    "komponen {name} sudah layak dan sesuai, bagus",
    "ok untuk komponen {name}, sudah sesuai dan berjalan dengan baik",
    "komponen {name} sudah sesuai dan tidak ada kendala, bagus",
    "untuk komponen {name} sudah baik, tepat, dan sesuai",
  ];
  // Ganti nama yang janggal di website dengan nama yang lebih rapi (opsional)
  const NAME_OVERRIDES = {
    "Individual,Assigment,Project,Quiz,Presentation": "Individual, Assignment, Project, Quiz, dan Presentation",
    "Overall Evaluation, Feedback, Other thing etc": "Overall Evaluation, Feedback, dan lainnya",
  };
  const AUTO_SUMMARY_SAVE = false; // false = kamu klik Save di Summary sendiri
  const AUTO_SUBMIT = false;       // false = kamu klik Submit sendiri
  const TABS = ["aspect2", "aspect3", "aspect4", "aspect5"]; // I - IV
  const SUMMARY_TAB = "aspect6";
  // =======================

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const waitFor = async (fn, timeout = 4000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < timeout) {
      const r = fn();
      if (r) return r;
      await sleep(100);
    }
    return null;
  };
  const btnByText = (root, text) =>
    [...root.querySelectorAll("button")].find(
      (b) => b.textContent.trim().toLowerCase() === text.toLowerCase()
    );


  // ===== Penanganan pop-up =====
  const POSITIVE = /^(yes|ok|okay|oke|confirm|continue|proceed|submit|save|ya|lanjut|lanjutkan|simpan|kirim|setuju|got it)$/i;
  const NEGATIVE = /(cancel|batal|no|tidak|close|tutup|back|kembali)/i;
  const POPUP_SELECTOR = [
    ".modal.show", ".modal.in", "[role='dialog']", "[role='alertdialog']",
    ".sweet-alert", ".swal2-popup", ".swal-modal", ".ReactModal__Content", "[class*='modal' i][class*='content' i]"
  ].join(",");
  const isVisible = (el) => !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);

  // Cari pop-up yang tampil, klik tombol konfirmasi. Return true kalau ada pop-up.
  const handlePopup = async (label = "", wait = 1500) => {
    const popup = await waitFor(
      () => [...document.querySelectorAll(POPUP_SELECTOR)].find(isVisible), wait
    );
    if (!popup) return false;

    const buttons = [...popup.querySelectorAll("button, [role='button']")].filter(isVisible);
    const names = buttons.map((b) => b.textContent.trim());
    console.log(`[popup ${label}] teks: "${popup.innerText.trim().slice(0, 150)}" | tombol:`, names);

    let target = buttons.find((b) => POSITIVE.test(b.textContent.trim()));
    if (!target && buttons.length === 1) target = buttons[0];
    if (!target) target = buttons.find((b) => !NEGATIVE.test(b.textContent.trim()));

    if (target) {
      console.log(`[popup ${label}] klik: "${target.textContent.trim()}"`);
      target.click();
      await sleep(1200);
      await handlePopup(label + "+", 800); // pop-up berantai (konfirmasi lalu sukses)
    } else {
      console.warn(`[popup ${label}] tombol tidak dikenali. HTML:`, popup.outerHTML);
    }
    return true;
  };


  // Watcher: klik OK otomatis di sweet-alert kapan pun muncul (mis. server lambat)
  const watcher = setInterval(() => {
    document.querySelectorAll(".sweet-alert").forEach((p) => {
      if (!isVisible(p)) return;
      const ok = [...p.querySelectorAll("button")].find(
        (b) => POSITIVE.test(b.textContent.trim()) && isVisible(b)
      );
      if (ok) {
        console.log(`[watcher] "${p.querySelector("h2")?.textContent.trim()}" -> klik ${ok.textContent.trim()}`);
        ok.click();
      }
    });
  }, 400);


  // Ambil nama komponen dari judul section yang membungkus card
  const getComponentName = (card) => {
    let region = card.closest(".C--CollapseRegion");
    while (region) {
      const title = region
        .querySelector(":scope > .C--CollapseRegion--header .font-weight-bold")
        ?.textContent.replace(/\s+/g, " ").trim();
      if (title && !/^Specific Aspect:/i.test(title)) return NAME_OVERRIDES[title] || title;
      region = region.parentElement?.closest(".C--CollapseRegion");
    }
    return "ini"; // fallback: "komponen ini"
  };
  let lastTemplate = -1;
  const buildRemark = (card) => {
    let idx;
    do { idx = Math.floor(Math.random() * REMARK_TEMPLATES.length); }
    while (idx === lastTemplate && REMARK_TEMPLATES.length > 1);
    lastTemplate = idx;
    return REMARK_TEMPLATES[idx].replace("{name}", getComponentName(card));
  };

  const setTextarea = (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };

  const selectOption = async (card, text) => {
    const control = card.querySelector(".dd__control");
    if (!control) return false;
    const current = control.querySelector(".dd__single-value");
    if (current && current.textContent.trim() === text) return true;

    control.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 }));
    const option = await waitFor(() =>
      [...(card.querySelectorAll(".dd__option")).length
        ? card.querySelectorAll(".dd__option")
        : document.querySelectorAll(".dd__option")
      ].find((o) => o.textContent.trim() === text)
    );
    if (!option) { console.warn("Opsi tidak ditemukan:", text); return false; }
    option.click();
    await sleep(300);
    const now = card.querySelector(".dd__single-value");
    return !!now && now.textContent.trim() === text;
  };

  // Buka semua section yang tertutup, level demi level
  const expandAll = async () => {
    for (let pass = 0; pass < 4; pass++) {
      const closed = [...document.querySelectorAll(".C--CollapseRegion")].filter((r) => {
        const c = r.querySelector(":scope > .C--CollapseRegion--content");
        return c && !c.classList.contains("block");
      });
      if (!closed.length) break;
      closed.forEach((r) => r.querySelector(":scope > .C--CollapseRegion--header")?.click());
      await sleep(500);
    }
  };

  const processTab = async (label) => {
    await expandAll();
    const total = document.querySelectorAll(".C--card.type--1").length;
    console.log(`[${label}] ${total} section`);

    for (let i = 0; i < total; i++) {
      // query ulang tiap iterasi karena React bisa render ulang setelah Save
      const card = document.querySelectorAll(".C--card.type--1")[i];
      if (!card) continue;

      const ok = await selectOption(card, STATUS);
      const ta = card.querySelector("textarea");
      if (ta && !ta.disabled) {
        const remark = buildRemark(card);
        setTextarea(ta, remark);
        console.log(`  section ${i + 1}: remark = "${remark}"`);
      }
      await sleep(300);

      const save = btnByText(card, "Save");
      if (ok && save) {
        save.click();
        await sleep(500);
        await handlePopup(`${label} #${i + 1}`);
        await sleep(1000);
        console.log(`  section ${i + 1}: tersimpan`);
      } else {
        console.warn(`  section ${i + 1}: GAGAL (status=${ok}, save=${!!save})`);
      }
    }
  };

  try {
    for (const id of TABS) {
      const tab = document.getElementById(`tab-link-${id}`);
      if (!tab) { console.warn("Tab tidak ditemukan:", id); continue; }
      tab.click();
      await waitFor(() => tab.classList.contains("active"));
      await waitFor(() => document.querySelector(".C--card.type--1") || document.querySelector(".C--CollapseRegion"));
      await sleep(1000);
      await processTab(tab.textContent.trim());
    }

    // Summary
    const sTab = document.getElementById(`tab-link-${SUMMARY_TAB}`);
    sTab.click();
    await waitFor(() => sTab.classList.contains("active"));
    await sleep(1500);

    const saveSummary = AUTO_SUMMARY_SAVE ? btnByText(document.querySelector("main"), "Save") : null;
    if (!AUTO_SUMMARY_SAVE) {
      console.log("[Summary] dibuka. Silakan klik Save (dan Submit) sendiri.");
    } else if (saveSummary) {
      saveSummary.click();
      await sleep(500);
      await handlePopup("summary-save");
      await sleep(1000);
      console.log("[Summary] Save diklik");
    } else {
      console.warn("[Summary] tombol Save tidak ditemukan");
    }

    if (AUTO_SUBMIT) {
      const submit = btnByText(document, "Submit");
      if (submit) {
        submit.click();
        console.log("Submit diklik");
        await sleep(500);
        await handlePopup("submit", 3000);
      } else {
        console.warn("Tombol Submit tidak ditemukan di halaman");
      }
    }
    console.log("Selesai");
  } catch (e) {
    console.error("Automation error:", e);
  } finally {
    clearInterval(watcher);
    window.__autofillRunning = false;
  }
})();
