(function () {
  const emailLink = document.getElementById("email-link");
  if (!emailLink) return;
  const user = emailLink.getAttribute("data-user");
  const domain = emailLink.getAttribute("data-domain");
  if (!user || !domain) return;
  const email = user + "@" + domain;
  emailLink.href = "mailto:" + email;
  emailLink.textContent = email;
  emailLink.removeAttribute("data-user");
  emailLink.removeAttribute("data-domain");
})();
