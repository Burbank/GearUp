(() => {
  const el = document.getElementById("opens");
  fetch("/api/usage", { cache: "no-store" })
    .then((res) => (res.ok ? res.json() : null))
    .then((data) => {
      const n = data && Number(data.opens);
      el.textContent = Number.isFinite(n)
        ? n === 1
          ? "Opened once."
          : `Opened ${n} times.`
        : "Count unavailable.";
    })
    .catch(() => {
      el.textContent = "Count unavailable.";
    });
})();
