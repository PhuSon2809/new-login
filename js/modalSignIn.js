const importTab = document.getElementById("import-tab");
const createTab = document.getElementById("create-tab");
const importContent = document.getElementById("import-content");
const createContent = document.getElementById("create-content");
const tabIndicator = document.getElementById("tab-indicator");
const toggleLink = document.getElementById("toggle-link");
const toggleContent = document.getElementById("toggle-content");
let isImportTab = true;

function setTab(importTabSelected) {
  isImportTab = importTabSelected;
  console.log("importTabSelected", importTabSelected);
  if (isImportTab) {
    importContent.classList.remove("hidden");
    importContent.classList.add("block");
    createContent.classList.add("hidden");
    createContent.classList.remove("block");
    tabIndicator.style.left = "0";
    toggleContent.innerHTML = `New User? <span id="toggle-link" class="text-[#0D0D0D] font-customSemiBold underline-offset-2 underline">Create a new wallet</span>`;
  } else {
    importContent.classList.add("hidden");
    importContent.classList.remove("block");
    createContent.classList.remove("hidden");
    createContent.classList.add("block");
    tabIndicator.style.left = "50%";
    toggleContent.innerHTML = `Have a wallet? <span id="toggle-link" class="text-[#0D0D0D] font-customSemiBold underline-offset-2 underline">Import an existing wallet</span>`;
  }
  document.getElementById("toggle-link").addEventListener("click", () => {
    setTab(!isImportTab);
  });
}

importTab.addEventListener("click", () => {
  setTab(true);
});

createTab.addEventListener("click", () => {
  setTab(false);
});

toggleLink.addEventListener("click", () => {
  setTab(!isImportTab);
});
