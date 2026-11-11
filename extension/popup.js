const $ = (id) => document.getElementById(id);

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  let host = "";
  try { host = new URL(tabs[0].url).hostname; } catch (_) {}
  $("host").textContent = host || "this site";
  $("muted").disabled = !host;

  chrome.storage.sync.get({ enabled: true, light: false, simple: false, lang: "en", mutedSites: [], familyNumber: "" }, (s) => {
    $("lang").value = s.lang;
    $("lang").onchange = () => chrome.storage.sync.set({ lang: $("lang").value });
    $("enabled").checked = s.enabled;
    $("light").checked = s.light;
    $("simple").checked = s.simple;
    $("simple").onchange = () => chrome.storage.sync.set({ simple: $("simple").checked });
    $("muted").checked = s.mutedSites.includes(host);
    $("family").value = s.familyNumber;
    $("family").onchange = () => chrome.storage.sync.set({ familyNumber: $("family").value.replace(/\D/g, "") });

    $("enabled").onchange = () => chrome.storage.sync.set({ enabled: $("enabled").checked });
    $("light").onchange = () => chrome.storage.sync.set({ light: $("light").checked });
    $("muted").onchange = () => {
      const list = new Set(s.mutedSites);
      if ($("muted").checked) list.add(host); else list.delete(host);
      s.mutedSites = [...list];
      chrome.storage.sync.set({ mutedSites: s.mutedSites });
    };
  });
});
