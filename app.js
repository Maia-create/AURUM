// COOKIE

function setCookie(name, value, days = 1) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Strict`;
}

function getCookie(name) {
  const cookies = document.cookie.split("; ");
  for (const cookie of cookies) {
    const [key, val] = cookie.split("=");
    if (key === name) return decodeURIComponent(val || "");
  }
  return "";
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

//TOKEN 
function getAccessToken() {
  return getCookie("aurum_access_token");
}
function setTokens(access, refresh) {
  if (access) setCookie("aurum_access_token", access, 1);
  if (refresh) setCookie("aurum_refresh_token", refresh, 7);
}
function clearTokens() {
  deleteCookie("aurum_access_token");
  deleteCookie("aurum_refresh_token");
  deleteCookie("aurum_user");
}
function getUser() {
  try {
    const val = getCookie("aurum_user");
    return val ? JSON.parse(val) : null;
  } catch {
    return null;
  }
}
function setUser(u) {
  setCookie("aurum_user", JSON.stringify(u), 1);
}

// VALIDATION 
const regexData = {
  name_en: /^[A-Za-z]{2,30}(?:[ -][A-Za-z]{2,30})?$/,
  name_ka: /^[ა-ჰ]{2,30}(?:[ -][ა-ჰ]{2,30})?$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
  password: /^.{8,64}$/,
  phoneGE: /^\+995[57]\d{8}$/,
  age: /^(?:1[01]\d|120|[1-9]?\d)$/,
  zipcode: /^\d{4,6}$/,
  address: /^.{5,120}$/,
  url: /^(https?:\/\/)([\w-]+\.)+[\w-]+(\/[\w\-./?%&=]*)?$/,
};

function isValid(value, regex) {
  return regex.test(String(value || "").trim());
}

function isValidName(val) {
  const v = String(val || "").trim();
  return regexData.name_en.test(v) || regexData.name_ka.test(v);
}

function setFormMessage(el, msg, type = "error") {
  if (!el) return;
  el.textContent = msg;
  el.className = `authMessage ${type === "success" ? "success" : "error"}`;
}

function normalize(val) {
  return String(val || "").trim();
}

// 
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(n) {
  return (Number(n) || 0).toLocaleString("ka-GE") + " ₾";
}

function stars(r) {
  const full = Math.round(Number(r) || 0);
  let s = "";
  for (let i = 1; i <= 5; i++) s += i <= full ? "★" : "☆";
  return `<span class="stars">${s}</span>`;
}

function showToast(message, type = "info") {
  const existing = document.querySelector(".toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.classList.add("show"), 10);
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// CONFIRM 
function showConfirm(message, title = "დადასტურება") {
  return new Promise((resolve) => {
    const existing = document.querySelector(".confirmBackdrop");
    if (existing) existing.remove();

    const backdrop = document.createElement("div");
    backdrop.className = "confirmBackdrop";
    backdrop.innerHTML = `
      <div class="confirmModal">
        <div class="confirmIcon">⚠️</div>
        <div class="confirmTitle">${title}</div>
        <div class="confirmMessage">${message}</div>
        <div class="confirmButtons">
          <button class="btn ghost confirmCancel">გაუქმება</button>
          <button class="btn gold confirmOk">დადასტურება</button>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    setTimeout(() => backdrop.classList.add("show"), 10);

    const closeModal = (result) => {
      backdrop.classList.remove("show");
      setTimeout(() => backdrop.remove(), 300);
      resolve(result);
    };

    backdrop.querySelector(".confirmCancel").addEventListener("click", () => closeModal(false));
    backdrop.querySelector(".confirmOk").addEventListener("click", () => closeModal(true));
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) closeModal(false);
    });
  });
}

//DOM ELEMENTS 
const page = document.body.getAttribute("data-page");
const appEl = document.getElementById("app");
const sidebarEl = document.getElementById("sidebar");
const cartBadgeEl = document.getElementById("cartBadge");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const authBtn = document.getElementById("authBtn");
const userNameEl = document.getElementById("userName");

// PAGINATION STATE 
let currentPage = 1;
let totalPages = 1;
let totalProducts = 0;

//  AUTH UI 
function updateUserUI() {
  const u = getUser();
  if (userNameEl) {
    userNameEl.textContent = u?.firstName || "სტუმარი";
  }
}

function handleAuthClick() {
  if (getAccessToken()) {
    // Logout 
    fetch("https://api.everrest.educata.dev/auth/sign_out", {
      method: "POST",
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    }).finally(() => {
      clearTokens();
      updateUserUI();
      updateCartBadge();
      showToast("წარმატებით გამოხვედით ✅", "success");
      setTimeout(() => window.location.reload(), 1000);
    });
  } else {
    window.location.href = "auth.html";
  }
}

if (authBtn) authBtn.addEventListener("click", handleAuthClick);

// AUTH PAGE 
function setupAuthPage() {
  const signinForm = document.getElementById("signinForm");
  const signupForm = document.getElementById("signupForm");
  const authTabs = document.querySelectorAll(".authTab");
  const signinMessage = document.getElementById("signinMessage");
  const signupMessage = document.getElementById("signupMessage");

  if (!signinForm || !signupForm) return;

  authTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      authTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const tabName = tab.getAttribute("data-tab");
      if (tabName === "signin") {
        signinForm.classList.remove("hidden");
        signupForm.classList.add("hidden");
      } else {
        signinForm.classList.add("hidden");
        signupForm.classList.remove("hidden");
      }
    });
  });

  // Sign In
  signinForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    signinMessage.textContent = "";

    const email = document.getElementById("signinEmail").value.trim();
    const password = document.getElementById("signinPassword").value;

    if (!email || !password) {
      setFormMessage(signinMessage, "შეავსეთ ყველა ველი");
      return;
    }

    if (!isValid(email, regexData.email)) {
      setFormMessage(signinMessage, "ელ-ფოსტის ფორმატი არასწორია");
      return;
    }

    if (!isValid(password, regexData.password)) {
      setFormMessage(signinMessage, "პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს");
      return;
    }

    try {
      signinMessage.textContent = "იტვირთება...";

      const res = await fetch("https://api.everrest.educata.dev/auth/sign_in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      

      if (!res.ok) {
        throw new Error(data.message || "შესვლა ვერ მოხერხდა");
      }

      setTokens(data.access_token, data.refresh_token);
      setUser({ email, firstName: email.split("@")[0] });

      signinMessage.textContent = "წარმატებით შეხვედით! ✅";
      signinMessage.className = "authMessage success";

      setTimeout(() => {
        window.location.href = "index.html";
      }, 1000);
    } catch (e) {
      signinMessage.textContent = e.message;
      signinMessage.className = "authMessage error";
    }
  });

  // Sign Up
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    signupMessage.textContent = "";

    const firstName = document.getElementById("signupFirstName").value.trim();
    const lastName = document.getElementById("signupLastName").value.trim();
    const age = Number(document.getElementById("signupAge").value);
    const gender = document.getElementById("signupGender").value;
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value;
    const phone = document.getElementById("signupPhone").value.trim();
    const address = document.getElementById("signupAddress").value.trim();
    const zipcode = document.getElementById("signupZipcode").value.trim();
    const avatar = document.getElementById("signupAvatar").value.trim() || "https://i.imgur.com/IBhCeeP.jpg";

    if (!firstName || !lastName || !age || !gender || !email || !password || !phone || !address || !zipcode) {
      setFormMessage(signupMessage, "შეავსეთ ყველა ველი");
      return;
    }

    // Detailed validation
    if (!isValidName(firstName)) {
      setFormMessage(signupMessage, "სახელი არასწორია (2-30 სიმბოლო, ქართული ან ლათინური)");
      return;
    }
    if (!isValidName(lastName)) {
      setFormMessage(signupMessage, "გვარი არასწორია (2-30 სიმბოლო, ქართული ან ლათინური)");
      return;
    }
    if (!isValid(age, regexData.age)) {
      setFormMessage(signupMessage, "ასაკი უნდა იყოს 1-დან 120-მდე");
      return;
    }
    if (!isValid(email, regexData.email)) {
      setFormMessage(signupMessage, "ელ-ფოსტის ფორმატი არასწორია");
      return;
    }
    if (!isValid(password, regexData.password)) {
      setFormMessage(signupMessage, "პაროლი უნდა შეიცავდეს მინიმუმ 8 სიმბოლოს");
      return;
    }
    if (!isValid(phone, regexData.phoneGE)) {
      setFormMessage(signupMessage, "ტელეფონის ფორმატი: +9955XXXXXXXX ან +9957XXXXXXXX");
      return;
    }
    if (!isValid(address, regexData.address)) {
      setFormMessage(signupMessage, "მისამართი უნდა იყოს 5-120 სიმბოლო");
      return;
    }
    if (!isValid(zipcode, regexData.zipcode)) {
      setFormMessage(signupMessage, "საფოსტო კოდი უნდა იყოს 4-6 ციფრი");
      return;
    }
    if (avatar && avatar !== "https://i.imgur.com/IBhCeeP.jpg" && !isValid(avatar, regexData.url)) {
      setFormMessage(signupMessage, "ავატარის URL არასწორია");
      return;
    }

    try {
      signupMessage.textContent = "იტვირთება...";

      const res = await fetch("https://api.everrest.educata.dev/auth/sign_up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName, age, email, password, address, phone, zipcode, avatar, gender }),
      });

      const data = await res.json();
      

      if (!res.ok) {
        throw new Error(data.message || "რეგისტრაცია ვერ მოხერხდა");
      }

      signupMessage.textContent = "წარმატებით დარეგისტრირდით! ✅";
      signupMessage.className = "authMessage success";

      setTimeout(() => {
        document.querySelector('.authTab[data-tab="signin"]')?.click();
        document.getElementById("signinEmail").value = email;
      }, 1500);
    } catch (e) {
      signupMessage.textContent = e.message;
      signupMessage.className = "authMessage error";
    }
  });
}

//  CART
async function updateCartBadge() {
  if (!cartBadgeEl) return;

  if (!getAccessToken()) {
    cartBadgeEl.textContent = "0";
    return;
  }

  try {
    const res = await fetch("https://api.everrest.educata.dev/shop/cart", {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    });

    if (!res.ok) {
      cartBadgeEl.textContent = "0";
      return;
    }

    const cart = await res.json();
    cartBadgeEl.textContent = String(cart?.total?.quantity || 0);
  } catch {
    cartBadgeEl.textContent = "0";
  }
}

// ADD TO CART 
async function addToCart(productId, qty = 1) {
  if (!getAccessToken()) {
    showToast("კალათის გამოსაყენებლად გაიარეთ ავტორიზაცია 🔐", "info");
    setTimeout(() => {
      window.location.href = "auth.html";
    }, 1500);
    return;
  }

  try {
    // პროდუქტის მარაგი 
    const prodRes = await fetch(`https://api.everrest.educata.dev/shop/products/id/${productId}`);
    const product = await prodRes.json();
    const stock = Number(product?.stock || 0);

    if (stock === 0) {
      showToast("პროდუქტი არ არის მარაგში ❌", "error");
      return;
    }

    //  კალათა 
    const cartRes = await fetch("https://api.everrest.educata.dev/shop/cart", {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    });
    
    let existingQty = 0;
    let cartExists = false;
    
    if (cartRes.ok) {
      const cart = await cartRes.json();
      cartExists = true;
      const existingItem = cart.products?.find(p => p.productId === productId);
      if (existingItem) {
        existingQty = existingItem.quantity || 0;
      }
    }

    //PATCH ან POST
    const newQty = existingQty + qty;
    if (newQty > stock) {
      showToast(`მარაგში მხოლოდ ${stock} ცალია ⚠️`, "error");
      return;
    }

    if (cartExists) {
      // კალათა არსებობს - PATCH
      const res = await fetch("https://api.everrest.educata.dev/shop/cart/product", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ id: productId, quantity: newQty }),
      });

      if (res.ok) {
        await updateCartBadge();
        showToast("კალათაში დაემატა ✅", "success");
      } else {
        const err = await res.json();
        showToast(err.message || "შეცდომა", "error");
      }
    } else {
      // კალათა არ არსებობს - POST
      const res = await fetch("https://api.everrest.educata.dev/shop/cart/product", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify({ id: productId, quantity: qty }),
      });

      if (res.ok) {
        await updateCartBadge();
        showToast("კალათაში დაემატა ✅", "success");
      } else {
        const err = await res.json();
        showToast(err.message || "შეცდომა", "error");
      }
    }
  } catch (e) {
    console.error("addToCart error:", e);
    showToast("შეცდომა: " + e.message, "error");
  }
}

//  SEARCH 
if (searchBtn) {
  searchBtn.addEventListener("click", () => {
    const q = searchInput?.value?.trim() || "";
    window.location.href = `index.html?q=${encodeURIComponent(q)}`;
  });
}
if (searchInput) {
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const q = searchInput.value.trim();
      window.location.href = `index.html?q=${encodeURIComponent(q)}`;
    }
  });
}

//  HOME PAGE 
async function renderHome() {
  if (!appEl) return;

  // URL პარამეტრები
  const params = new URLSearchParams(window.location.search);
  const searchQuery = params.get("q") || "";
  const pageParam = Number(params.get("page")) || 1;
  const catParam = params.get("cat") || "";
  const brandParam = params.get("brand") || "";
  const minPriceParam = Number(params.get("minPrice")) || 0;
  const maxPriceParam = Number(params.get("maxPrice")) || 999999;
  const ratingParam = Number(params.get("rating")) || 0;

  currentPage = pageParam;

  if (searchInput && searchQuery) {
    searchInput.value = searchQuery;
  }

  // Sidebar
  await renderSidebar();

  try {
    // პროდუქტების ჩატვირთვა 
    let url = `https://api.everrest.educata.dev/shop/products/all?page_index=${currentPage}`;
    
    if (searchQuery) {
      url = `https://api.everrest.educata.dev/shop/products/search?page_index=${currentPage}&keywords=${encodeURIComponent(searchQuery)}`;
    } else if (catParam) {
      url = `https://api.everrest.educata.dev/shop/products/category/${catParam}?page_index=${currentPage}`;
    } else if (brandParam) {
      url = `https://api.everrest.educata.dev/shop/products/brand/${brandParam}?page_index=${currentPage}`;
    }

    
    const res = await fetch(url);
    const data = await res.json();
    console.table((data.products || []).map(p => ({
  title: p.title,
  id: p._id || p.id,
  price: p.price?.current,
  stock: p.stock
})));

    

    // API 
    let products = data.products || [];
    
    // პაგინაციისთვის
    const apiTotal = data.total || products.length;
    const apiLimit = data.limit || 5;
    
    // კლიენტის მხარეს ფილტრაცია 
    if (minPriceParam > 0 || maxPriceParam < 999999 || ratingParam > 0) {
      products = products.filter((p) => {
        const price = p.price?.current || 0;
        const rating = p.rating || 0;
        
        if (price < minPriceParam) return false;
        if (price > maxPriceParam) return false;
        if (rating < ratingParam) return false;
        
        return true;
      });
    }

    // პაგინაცია API-დან
    totalProducts = apiTotal;
    totalPages = Math.ceil(totalProducts / apiLimit);
    
    if (totalPages < 1) totalPages = 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    if (!products.length) {
      appEl.innerHTML = `<div style="text-align:center; padding:30px; color:var(--muted);">პროდუქტები ვერ მოიძებნა.</div>`;
      return;
    }

    //პაგინაციაა
    let paginationHtml = "";
    if (totalPages > 1) {
      paginationHtml = `
        <div class="pagination">
          <button class="btn ghost paginationBtn" id="prevPage" ${currentPage <= 1 ? "disabled" : ""}>← წინა</button>
          <span class="paginationInfo">გვერდი ${currentPage} / ${totalPages}</span>
          <button class="btn ghost paginationBtn" id="nextPage" ${currentPage >= totalPages ? "disabled" : ""}>შემდეგი →</button>
        </div>
      `;
    }

    appEl.innerHTML = `
      <div class="grid">
        ${products.map((p) => {
          const id = p._id || p.id;
          const img = p.thumbnail || "";
          const price = p.price?.current || 0;
          const oldPrice = p.price?.beforeDiscount || 0;
          const rating = p.rating || 0;
          const stock = p.stock || 0;
          const outOfStock = stock <= 0;

          return `
            <div class="card ${outOfStock ? "out-of-stock" : ""}">
              <div class="cardImg" data-open="${escapeHtml(id)}" style="cursor:pointer; position:relative;">
               ${img ? `<img src="${escapeHtml(img)}" alt="${escapeHtml(p.title)}" onerror="this.src='https://placehold.co/300x200/1a1a1a/666?text=No+Image'">` : `<div style="color:var(--muted)">No image</div>`}
                ${outOfStock ? '<div class="stockBadge">არ არის მარაგში</div>' : ""}
              </div>
              <div class="cardName" data-open="${escapeHtml(id)}" style="cursor:pointer">${escapeHtml(p.title)}</div>
              <div class="cardMeta">
                <div>${stars(rating)} ${rating.toFixed(1)}</div>
                <div style="color:${outOfStock ? "red" : "var(--muted)"}">მარაგი: ${stock}</div>
              </div>
              <div class="priceRow">
                <div class="price">${money(price)}</div>
                ${oldPrice > price ? `<div class="oldPrice">${money(oldPrice)}</div>` : ""}
              </div>
              <button class="btn gold" data-add="${escapeHtml(id)}" ${outOfStock ? "disabled" : ""}>
                ${outOfStock ? "არ არის მარაგში" : "კალათაში 🧺"}
              </button>
            </div>
          `;
        }).join("")}
      </div>
      ${paginationHtml}
    `;

    
    appEl.querySelectorAll("[data-open]").forEach((el) => {
      el.addEventListener("click", () => {
        window.location.href = `product.html?id=${el.getAttribute("data-open")}`;
      });
    });

    appEl.querySelectorAll("[data-add]:not([disabled])").forEach((el) => {
      el.addEventListener("click", () => {
        addToCart(el.getAttribute("data-add"), 1);
      });
    });

    // პაგინაციის ღილაკები
    document.getElementById("prevPage")?.addEventListener("click", () => {
      if (currentPage > 1) {
        const newParams = new URLSearchParams(window.location.search);
        newParams.set("page", currentPage - 1);
        window.location.search = newParams.toString();
      }
    });

    document.getElementById("nextPage")?.addEventListener("click", () => {
      if (currentPage < totalPages) {
        const newParams = new URLSearchParams(window.location.search);
        newParams.set("page", currentPage + 1);
        window.location.search = newParams.toString();
      }
    });

  } catch (e) {
    console.error("Error:", e);
    appEl.innerHTML = `<div style="color:red; padding:20px;">შეცდომა: ${e.message}</div>`;
  }
}

// SIDEBAR 
async function renderSidebar() {
  if (!sidebarEl) return;

  // URL პარამეტრები
  const params = new URLSearchParams(window.location.search);
  const currentCat = params.get("cat") || "";
  const currentBrand = params.get("brand") || "";
  const currentMinPrice = params.get("minPrice") || "";
  const currentMaxPrice = params.get("maxPrice") || "";
  const currentRating = params.get("rating") || "0";

  try {
    // კატეგორიები 
    const catRes = await fetch("https://api.everrest.educata.dev/shop/products/categories");
    const categories = await catRes.json();

    // ბრენდები 
    const brandRes = await fetch("https://api.everrest.educata.dev/shop/products/brands");
    const brands = await brandRes.json();

    sidebarEl.innerHTML = `
      <!-- კატეგორია -->
      <div class="filterSection">
        <div class="filterHeader" data-toggle="catList">
          <span>კატეგორია</span>
          <span class="arrow">►</span>
        </div>
        <div class="filterBody collapsed" id="catList">
          <label class="filterRow">
            <input type="radio" name="cat" value="" ${!currentCat ? "checked" : ""}>
            <span>ყველა</span>
          </label>
          ${categories.map((c) => `
            <label class="filterRow">
              <input type="radio" name="cat" value="${escapeHtml(c.id)}" ${currentCat === String(c.id) ? "checked" : ""}>
              <span>${escapeHtml(c.name)}</span>
            </label>
          `).join("")}
        </div>
      </div>

      <!-- ბრენდი -->
      <div class="filterSection">
        <div class="filterHeader" data-toggle="brandList">
          <span>ბრენდი</span>
          <span class="arrow">►</span>
        </div>
        <div class="filterBody collapsed" id="brandList">
          <label class="filterRow">
            <input type="radio" name="brand" value="" ${!currentBrand ? "checked" : ""}>
            <span>ყველა</span>
          </label>
          ${brands.map((b) => `
            <label class="filterRow">
              <input type="radio" name="brand" value="${escapeHtml(b)}" ${currentBrand === b ? "checked" : ""}>
              <span>${escapeHtml(b)}</span>
            </label>
          `).join("")}
        </div>
      </div>

      <!-- ფასი -->
      <div class="filterSection">
        <div class="filterHeader" data-toggle="priceList">
          <span>ფასი</span>
          <span class="arrow">►</span>
        </div>
        <div class="filterBody collapsed" id="priceList">
          <div class="priceInputs">
            <input type="number" id="minPriceInput" placeholder="დან" value="${escapeHtml(currentMinPrice)}" min="0">
            <span>-</span>
            <input type="number" id="maxPriceInput" placeholder="მდე" value="${escapeHtml(currentMaxPrice)}" min="0">
          </div>
        </div>
      </div>

      <!-- რეიტინგი -->
      <div class="filterSection">
        <div class="filterHeader" data-toggle="ratingList">
          <span>რეიტინგი</span>
          <span class="arrow">►</span>
        </div>
        <div class="filterBody collapsed" id="ratingList">
          <label class="filterRow">
            <input type="radio" name="rating" value="0" ${currentRating === "0" ? "checked" : ""}>
            <span>ნებისმიერი</span>
          </label>
          <label class="filterRow">
            <input type="radio" name="rating" value="3" ${currentRating === "3" ? "checked" : ""}>
            <span>3★ და მეტი</span>
          </label>
          <label class="filterRow">
            <input type="radio" name="rating" value="4" ${currentRating === "4" ? "checked" : ""}>
            <span>4★ და მეტი</span>
          </label>
        </div>
      </div>

      <button class="btn gold" id="applyFilters" style="margin-top:12px;">ფილტრაცია</button>
      <button class="btn ghost" id="clearFilters" style="margin-top:6px;">გასუფთავება</button>
    `;

    // ჩამოსაშლელი ფილტრები
    document.querySelectorAll(".filterHeader").forEach((header) => {
      header.addEventListener("click", () => {
        const targetId = header.getAttribute("data-toggle");
        const body = document.getElementById(targetId);
        const arrow = header.querySelector(".arrow");
        
        body.classList.toggle("collapsed");
        arrow.textContent = body.classList.contains("collapsed") ? "►" : "▼";
      });
    });

    // კატეგორიის არჩევა - მაშინვე გადასვლა
    document.querySelectorAll('input[name="cat"]').forEach((input) => {
      input.addEventListener("change", () => {
        const catId = input.value;
        if (catId) {
          window.location.href = `index.html?cat=${catId}`;
        } else {
          window.location.href = "index.html";
        }
      });
    });

    // ბრენდის არჩევა - მაშინვე გადასვლა
    document.querySelectorAll('input[name="brand"]').forEach((input) => {
      input.addEventListener("change", () => {
        const brand = input.value;
        if (brand) {
          window.location.href = `index.html?brand=${brand}`;
        } else {
          window.location.href = "index.html";
        }
      });
    });

    // ფილტრაციის ღილაკი (ფასი, რეიტინგი)
    document.getElementById("applyFilters")?.addEventListener("click", () => {
      const params = new URLSearchParams(window.location.search);
      
      const minPrice = document.getElementById("minPriceInput")?.value;
      const maxPrice = document.getElementById("maxPriceInput")?.value;
      const rating = document.querySelector('input[name="rating"]:checked')?.value;

      if (minPrice) params.set("minPrice", minPrice);
      else params.delete("minPrice");
      
      if (maxPrice) params.set("maxPrice", maxPrice);
      else params.delete("maxPrice");
      
      if (rating && rating !== "0") params.set("rating", rating);
      else params.delete("rating");

      params.delete("page"); 
      window.location.search = params.toString();
    });

    // გასუფთავება
    document.getElementById("clearFilters")?.addEventListener("click", () => {
      window.location.href = "index.html";
    });

  } catch (e) {
    sidebarEl.innerHTML = `<div style="color:var(--muted)">ფილტრები ვერ ჩაიტვირთა</div>`;
  }
}

// PRODUCT DETAIL 
async function renderProductDetail() {
  if (!appEl) return;

  const params = new URLSearchParams(window.location.search);
  const productId = params.get("id");

  if (!productId) {
    appEl.innerHTML = `<div class="pageTitle">პროდუქტი ვერ მოიძებნა</div>`;
    return;
  }

  if (sidebarEl) {
    sidebarEl.innerHTML = `
      <a class="btn ghost" href="index.html">← მთავარი</a>
      <a class="btn gold" href="cart.html" style="margin-top:10px;">კალათა 🧺</a>
    `;
  }

  try {
    // პროდუქტის ჩატვირთვა 
    const res = await fetch(`https://api.everrest.educata.dev/shop/products/id/${productId}`);
    const p = await res.json();

    const price = p.price?.current || 0;
    const oldPrice = p.price?.beforeDiscount || 0;
    const stock = p.stock || 0;
    const rating = p.rating || 0;
    const outOfStock = stock === 0;
    const reviews = p.reviews || [];
    const ratings = p.ratings || [];
    const reviewCount = reviews.length + ratings.length;
    
    const issueDate = p.issueDate ? new Date(p.issueDate).toLocaleDateString("ka-GE") : "-";

    // ფოტოების მასივი 
    let images = [];
    if (p.thumbnail) images.push(p.thumbnail);
    if (p.images && Array.isArray(p.images)) {
      images = images.concat(p.images.filter(img => img && img.trim() !== ""));
    }
    // თუ არცერთი ფოტო არ არის, დავამატოთ placeholder
    if (images.length === 0) {
      images = ["https://placehold.co/400x300/1a1a1a/666?text=No+Image"];
    }


    appEl.innerHTML = `
      <div class="pageTitle"></div>
      <div class="detailWrap">
        <div class="gallery">
          <div class="bigImg">
            <img id="bigImg" src="${escapeHtml(images[0] || "")}" alt="${escapeHtml(p.title)}">
          </div>
          <div class="thumbs">
            ${images.map((img, i) => `
              <div class="thumb ${i === 0 ? "active" : ""}" data-src="${escapeHtml(img)}">
                <img src="${escapeHtml(img)}" alt="thumb">
              </div>
            `).join("")}
          </div>
        </div>

        <div class="detailPanel">
          <div class="brandLine">ბრენდი: <b>${escapeHtml(p.brand || "-")}</b></div>
          <div class="detailName">${escapeHtml(p.title)}</div>
          <div class="detailPrice">
            ${money(price)}
            ${oldPrice > price ? `<span class="oldPrice">${money(oldPrice)}</span>` : ""}
          </div>

          <div style="margin:10px 0; color:var(--muted)">
            გამოშვების თარიღი: <b>${issueDate}</b>
          </div>

          <div style="margin:10px 0; color:${outOfStock ? "red" : "var(--muted)"}">
            მარაგი: <b>${stock}</b> ცალი ${outOfStock ? "❌" : ""}
          </div>

          <div style="margin:10px 0;">${stars(rating)} <b>${rating.toFixed(1)}</b></div>

          <div class="detailActions">
            <div class="qtyControl">
              <button class="qbtn" id="qtyMinus" ${outOfStock ? "disabled" : ""}>−</button>
              <div class="qval" id="qtyVal">1</div>
              <button class="qbtn" id="qtyPlus" ${outOfStock ? "disabled" : ""}>+</button>
            </div>

            <button class="btn gold" id="addToCartBtn" ${outOfStock ? "disabled" : ""}>
              ${outOfStock ? "არ არის მარაგში ❌" : "კალათაში დამატება 🧺"}
            </button>

            <button class="btn ghost" id="rateBtn">შეფასება ⭐</button>
          </div>

          <!-- Tabs: Details / Review -->
          <div class="tabs">
            <div class="tab active" data-tab="details">Details</div>
            <div class="tab" data-tab="reviews">Review (${reviewCount})</div>
          </div>

          <div class="tabContent" id="tabContent">
            <!-- Details tab content (default) -->
            <div id="detailsTab">
              <p>${escapeHtml(p.description || "აღწერა არ არის")}</p>
              <p>კატეგორია: <b>${escapeHtml(p.category?.name || "-")}</b></p>
              <p>გარანტია: <b>${p.warranty || "-"}</b></p>
            </div>

            <!-- Reviews tab content (hidden by default) -->
            <div id="reviewsTab" class="hidden">
              ${(reviews.length > 0 || ratings.length > 0) ? `
                ${reviews.map(rev => `
                  <div class="reviewItem">
                    <div class="avatar">${rev.avatar ? `<img src="${escapeHtml(rev.avatar)}" style="width:100%;height:100%;border-radius:999px;object-fit:cover;">` : '👤'}</div>
                    <div style="flex:1;">
                      <div class="reviewName">${escapeHtml(rev.firstName || "ანონიმი")} ${escapeHtml(rev.lastName || "")}</div>
                      <div>${stars(rev.rating || 0)} <span style="color:var(--muted);font-size:11px;">(${(rev.rating || 0).toFixed(1)})</span></div>
                      ${rev.comment ? `<div class="reviewText">${escapeHtml(rev.comment)}</div>` : ''}
                    </div>
                  </div>
                `).join("")}
               ${ratings.map((rObj, idx) => {
  const numRating =
    typeof rObj === "object" && rObj !== null
      ? Number(rObj.value ?? rObj.rate ?? rObj.rating ?? 0)  
      : Number(rObj) || 0;

  const userLabel =
    typeof rObj === "object" && rObj !== null && rObj.userId
      ? `მომხმარებელი ${String(rObj.userId).slice(0, 6)}...`
      : `მომხმარებელი ${idx + 1}`;

  return `
    <div class="reviewItem">
      <div class="avatar">👤</div>
      <div style="flex:1;">
        <div class="reviewName">${userLabel}</div>
        <div>${stars(numRating)} <span style="color:var(--muted);font-size:11px;">(${numRating})</span></div>
      </div>
    </div>
  `;
}).join("")}

              ` : `<p style="color:var(--muted)">შეფასებები არ არის</p>`}
            </div>
          </div>
        </div>
      </div>

      <!-- Rating Modal -->
      <div class="modalBackdrop hidden" id="ratingModal">
        <div class="modal">
          <div class="modalHead">
            <div class="modalTitle">შეაფასე პროდუქტი</div>
            <button class="iconBtn" id="closeRatingModal">✕</button>
          </div>
          <p style="color:var(--muted); font-size:12px; margin-bottom:10px;">აირჩიე რეიტინგი (1-5)</p>
          <div class="ratingRow" id="ratingStars">
            <button class="starBtn" data-rating="1">☆</button>
            <button class="starBtn" data-rating="2">☆</button>
            <button class="starBtn" data-rating="3">☆</button>
            <button class="starBtn" data-rating="4">☆</button>
            <button class="starBtn" data-rating="5">☆</button>
          </div>
          <button class="btn gold" id="submitRating">OK</button>
          <div class="authMessage" id="ratingMessage"></div>
        </div>
      </div>
    `;

    // Thumbnails 
    const thumbsContainer = document.querySelector(".thumbs");
    if (thumbsContainer) {
      thumbsContainer.addEventListener("click", (e) => {
        const thumb = e.target.closest(".thumb");
        if (!thumb) return;
        
        document.querySelectorAll(".thumb").forEach((x) => x.classList.remove("active"));
        thumb.classList.add("active");
        
        const bigImg = document.getElementById("bigImg");
        if (bigImg) {
          bigImg.src = thumb.getAttribute("data-src");
        }
      });
    }

    //  error  ფოტოებისთვის
    const bigImg = document.getElementById("bigImg");
    if (bigImg) {
      bigImg.onerror = function() {
        this.src = "https://placehold.co/400x300/1a1a1a/666?text=Image+Not+Found";
        this.onerror = null; 
      };
    }

    document.querySelectorAll(".thumb img").forEach(img => {
      img.onerror = function() {
        this.src = "https://placehold.co/60x50/1a1a1a/666?text=No+Img";
        this.onerror = null; 
    }});

    // Tabs switching
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        const tabName = tab.getAttribute("data-tab");
        
        document.getElementById("detailsTab").classList.toggle("hidden", tabName !== "details");
        document.getElementById("reviewsTab").classList.toggle("hidden", tabName !== "reviews");
      });
    });

    // Quantity
    let qty = 1;
    const qtyVal = document.getElementById("qtyVal");
    document.getElementById("qtyMinus")?.addEventListener("click", () => {
      qty = Math.max(1, qty - 1);
      qtyVal.textContent = qty;
    });
    document.getElementById("qtyPlus")?.addEventListener("click", () => {
      qty = Math.min(stock || 1, qty + 1);
      qtyVal.textContent = qty;
    });

    // Add to cart
    document.getElementById("addToCartBtn")?.addEventListener("click", () => {
      addToCart(productId, qty);
    });

    // Rating 
    const ratingModal = document.getElementById("ratingModal");
    let selectedRating = 0;

    document.getElementById("rateBtn")?.addEventListener("click", () => {
      ratingModal.classList.remove("hidden");
    });

    document.getElementById("closeRatingModal")?.addEventListener("click", () => {
      ratingModal.classList.add("hidden");
    });

    ratingModal?.addEventListener("click", (e) => {
      if (e.target === ratingModal) ratingModal.classList.add("hidden");
    });

    // Star rating 
    document.querySelectorAll("#ratingStars .starBtn").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectedRating = Number(btn.getAttribute("data-rating"));
        document.querySelectorAll("#ratingStars .starBtn").forEach((b, i) => {
          b.textContent = i < selectedRating ? "★" : "☆";
          b.classList.toggle("active", i < selectedRating);
        });
      });
    });

    // Submit rating
    document.getElementById("submitRating")?.addEventListener("click", async () => {
      const ratingMessage = document.getElementById("ratingMessage");

      if (selectedRating < 1) {
        ratingMessage.textContent = "აირჩიეთ რეიტინგი";
        ratingMessage.className = "authMessage error";
        return;
      }

      const token = getAccessToken();

      // ავტორიზაციის შემოწმება
      if (!token) {
        ratingMessage.textContent = "შეფასებისთვის გაიარეთ ავტორიზაცია";
        ratingMessage.className = "authMessage error";
        setTimeout(() => {
          window.location.href = "auth.html";
        }, 1500);
        return;
      }

      try {
        ratingMessage.textContent = "იგზავნება...";

        const requestBody = {
          productId: productId,
          rate: selectedRating
        };

        const res = await fetch(`https://api.everrest.educata.dev/shop/products/rate`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(requestBody),
        });

        const responseData = await res.json();

        if (res.ok) {
          ratingMessage.textContent = "შეფასება დაემატა! ✅";
          ratingMessage.className = "authMessage success";
          
          
          setTimeout(() => {
            window.location.reload();
          }, 2500);
        } else {
          ratingMessage.textContent = responseData.message || "შეცდომა";
          ratingMessage.className = "authMessage error";
        }
      } catch (e) {
        console.error("Error:", e);
        ratingMessage.textContent = "შეცდომა: " + e.message;
        ratingMessage.className = "authMessage error";
      }
    });

  } catch (e) {
    appEl.innerHTML = `<div style="color:red">შეცდომა: ${e.message}</div>`;
  }
}

//  CART PAGE 
async function renderCart() {
  if (!appEl) return;

  if (sidebarEl) {
    sidebarEl.innerHTML = `<a class="btn ghost" href="index.html">← მთავარი</a>`;
  }

  if (!getAccessToken()) {
    appEl.innerHTML = `
      <div class="pageTitle">ჩემი კალათა</div>
      <div style="text-align:center; padding:50px;">
        <div style="font-size:60px;">🔐</div>
        <p style="color:var(--muted)">კალათის სანახავად გაიარეთ ავტორიზაცია</p>
        <a class="btn gold" href="auth.html">შესვლა</a>
      </div>
    `;
    return;
  }

  try {
    // კალათის ჩატვირთვა 
    const res = await fetch("https://api.everrest.educata.dev/shop/cart", {
      headers: { Authorization: `Bearer ${getAccessToken()}` },
    });

    if (!res.ok) {
      appEl.innerHTML = `
        <div class="pageTitle">ჩემი კალათა</div>
        <div style="text-align:center; padding:50px;">
          <div style="font-size:60px;">🧺</div>
          <p style="color:var(--muted)">კალათა ცარიელია</p>
          <a class="btn gold" href="index.html">მაღაზიაში დაბრუნება</a>
        </div>
      `;
      return;
    }

    const cart = await res.json();

    if (!cart.products?.length) {
      appEl.innerHTML = `
        <div class="pageTitle">ჩემი კალათა</div>
        <div style="text-align:center; padding:50px;">
          <div style="font-size:60px;">🧺</div>
          <p style="color:var(--muted)">კალათა ცარიელია</p>
          <a class="btn gold" href="index.html">მაღაზიაში დაბრუნება</a>
        </div>
      `;
      return;
    }

    // პროდუქტების დეტალები
    const items = [];
    for (const item of cart.products) {
      const prodRes = await fetch(`https://api.everrest.educata.dev/shop/products/id/${item.productId}`);
      if (prodRes.ok) {
        const prod = await prodRes.json();
        items.push({ ...item, product: prod });
      }
    }

    const totalPrice = cart.total?.price?.current || 0;

    appEl.innerHTML = `
      <div class="pageTitle">ჩემი კალათა</div>
      <div class="cartList">
        ${items.map((it) => `
          <div class="cartItem">
            <div class="cartImg">
             <img src="${escapeHtml(it.product.thumbnail || "")}" alt="" onerror="this.src='https://placehold.co/200x150/1a1a1a/666?text=No+Image'"> <img src="${escapeHtml(it.product.thumbnail || "")}" alt="">
            </div>
            <div>
              <div class="cartName">${escapeHtml(it.product.title)}</div>
              <div class="cartMeta">ფასი: ${money(it.pricePerQuantity)}</div>
              <div class="cartMeta">მარაგი: <b>${it.product.stock || 0}</b> ცალი</div>
              <div class="cartMeta">${stars(it.product.rating || 0)} <b>${(it.product.rating || 0).toFixed(1)}</b></div>
              <div class="cartMeta">Reviews: <b>${(it.product.reviews?.length || 0) + (it.product.ratings?.length || 0)}</b></div>
            </div>
            <div class="qtyControl">
              <button class="qbtn" data-dec="${it.productId}">−</button>
              <div class="qval">${it.quantity}</div>
              <button class="qbtn" data-inc="${it.productId}" ${it.quantity >= it.product.stock ? "disabled" : ""}>+</button>
            </div>
            <button class="trashBtn" data-del="${it.productId}">🗑</button>
          </div>
        `).join("")}
      </div>
      <div class="bottomBar">
        <div class="totalText">სულ: ${money(totalPrice)}</div>
        <div style="display:flex; gap:10px;">
          <button class="btn ghost" id="clearCart">გასუფთავება 🗑</button>
          <button class="btn gold" id="checkoutBtn">ყიდვა 💳</button>
        </div>
      </div>
    `;

    // რაოდენობის გაზრდა
    appEl.querySelectorAll("[data-inc]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const productId = btn.getAttribute("data-inc");
        const item = items.find((x) => x.productId === productId);
        if (!item) return;

        const res = await fetch("https://api.everrest.educata.dev/shop/cart/product", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAccessToken()}`,
          },
          body: JSON.stringify({ id: productId, quantity: item.quantity + 1 }),
        });

        if (res.ok) {
          await updateCartBadge();
          renderCart();
        }
      });
    });

    // რაოდენობის შემცირება
    appEl.querySelectorAll("[data-dec]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const productId = btn.getAttribute("data-dec");
        const item = items.find((x) => x.productId === productId);
        if (!item) return;

        if (item.quantity <= 1) {
          // წაშლა
          await fetch("https://api.everrest.educata.dev/shop/cart/product", {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getAccessToken()}`,
            },
            body: JSON.stringify({ id: productId }),
          });
        } else {
          await fetch("https://api.everrest.educata.dev/shop/cart/product", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getAccessToken()}`,
            },
            body: JSON.stringify({ id: productId, quantity: item.quantity - 1 }),
          });
        }

        await updateCartBadge();
        renderCart();
      });
    });

    // წაშლა
    appEl.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const productId = btn.getAttribute("data-del");

        await fetch("https://api.everrest.educata.dev/shop/cart/product", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAccessToken()}`,
          },
          body: JSON.stringify({ id: productId }),
        });

        await updateCartBadge();
        renderCart();
        showToast("წაიშალა კალათიდან 🗑", "success");
      });
    });

    // გასუფთავება
    document.getElementById("clearCart")?.addEventListener("click", async () => {
      const confirmed = await showConfirm("ნამდვილად გსურთ კალათის გასუფთავება?", "კალათის გასუფთავება");
      if (!confirmed) return;

      await fetch("https://api.everrest.educata.dev/shop/cart", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getAccessToken()}` },
      });

      await updateCartBadge();
      renderCart();
      showToast("კალათა გასუფთავდა ✅", "success");
    });

    // ყიდვა (Checkout)
    document.getElementById("checkoutBtn")?.addEventListener("click", async () => {
      try {
        const res = await fetch("https://api.everrest.educata.dev/shop/cart/checkout", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${getAccessToken()}` 
          },
        });

        if (res.ok) {
          await updateCartBadge();
          showToast("შეკვეთა წარმატებით გაიგზავნა! ✅", "success");
          setTimeout(() => {
            renderCart();
          }, 1500);
        } else {
          const err = await res.json();
          showToast(err.message || "შეკვეთა ვერ გაიგზავნა", "error");
        }
      } catch (e) {
        showToast("შეცდომა: " + e.message, "error");
      }
    });

  } catch (e) {
    appEl.innerHTML = `<div style="color:red">შეცდომა: ${e.message}</div>`;
  }
}

// BOOT 
(async function boot() {
  updateUserUI();
  await updateCartBadge();

  if (page === "auth") {
    setupAuthPage();
    if (getAccessToken()) {
      window.location.href = "index.html";
    }
  }

  if (page === "home") {
    await renderHome();
  }

  if (page === "product") {
    await renderProductDetail();
  }

  if (page === "cart") {
    await renderCart();
  }
})();