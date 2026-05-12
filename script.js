
// // Import the functions you need from the SDKs you need
// import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
// // TODO: Add SDKs for Firebase products that you want to use
// // https://firebase.google.com/docs/web/setup#available-libraries

// // Your web app's Firebase configuration
// // For Firebase JS SDK v7.20.0 and later, measurementId is optional
// const firebaseConfig = {
//     apiKey: "AIzaSyBz6RGxzrJPn6vxEKsplnRT4STnEybtmBw",
//     authDomain: "cloud-wallet-02.firebaseapp.com",
//     projectId: "cloud-wallet-02",
//     storageBucket: "cloud-wallet-02.firebasestorage.app",
//     messagingSenderId: "884165767902",
//     appId: "1:884165767902:web:557da8dde029ec2349c84f",
//     measurementId: "G-GQXGF0L4XJ"
// };

// // Initialize Firebase
// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

// استيراد Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, getDoc, updateDoc, addDoc, query, where, orderBy, getDocs, Timestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBz6RGxzrJPn6vxEKsplnRT4STnEybtmBw",
    authDomain: "cloud-wallet-02.firebaseapp.com",
    projectId: "cloud-wallet-02",
    storageBucket: "cloud-wallet-02.firebasestorage.app",
    messagingSenderId: "884165767902",
    appId: "1:884165767902:web:557da8dde029ec2349c84f",
    measurementId: "G-GQXGF0L4XJ"
};
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth();
const db = getFirestore();

// عناصر DOM
const authSection = document.getElementById('authSection');
const dashboard = document.getElementById('dashboard');
const loginFormDiv = document.getElementById('loginForm');
const signupFormDiv = document.getElementById('signupForm');
const userEmailSpan = document.getElementById('userEmailSpan');
const logoutBtn = document.getElementById('logoutBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const monthlyIncomeInput = document.getElementById('monthlyIncome');
const essPercentInput = document.getElementById('essPercent');
const wantsPercentInput = document.getElementById('wantsPercent');
const investPercentInput = document.getElementById('investPercent');
const percentWarning = document.getElementById('percentWarning');
const budgetOverview = document.getElementById('budgetOverview');
const expenseCategory = document.getElementById('expenseCategory');
// const subCategorySelect = document.getElementById('subCategorySelect');
const customSubInput = document.getElementById('customSubInput');
const toggleCustomBtn = document.getElementById('toggleCustomBtn');
const expenseAmount = document.getElementById('expenseAmount');
const addExpenseBtn = document.getElementById('addExpenseBtn');
const transactionsListDiv = document.getElementById('transactionsList');

/////////////////////////////////////////////////////////////////////////////////////////
// عناصر النافذة المنبثقة
const modal = document.getElementById('expenseModal');
const openModalBtn = document.getElementById('openModalBtn');
const closeModalBtn = document.querySelector('.close-modal');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalAddExpenseBtn = document.getElementById('modalAddExpenseBtn');
const modalExpenseCategory = document.getElementById('modalExpenseCategory');
const modalExpenseAmount = document.getElementById('modalExpenseAmount');
const searchSubInput = document.getElementById('searchSubInput');
const subItemsList = document.getElementById('subItemsList');

function renderSubItemsList(searchText = "") {
    const allSubs = getFullSubList();
    let filtered = allSubs;
    if (searchText.trim() !== "") {
        filtered = allSubs.filter(sub => sub.name.includes(searchText));
    }
    if (filtered.length === 0) {
        subItemsList.innerHTML = `<div class="sub-option">لا توجد نتائج. يمكنك إضافة صنف مخصص لاحقاً.</div>`;
        return;
    }
    let html = "";
    filtered.forEach(sub => {
        const selectedClass = (currentSelectedSub === sub.name) ? "selected" : "";
        html += `<div class="sub-option ${selectedClass}" data-subname="${sub.name}">${sub.name}</div>`;
    });
    subItemsList.innerHTML = html;
    
    // إضافة حدث النقر لكل خيار
    document.querySelectorAll('.sub-option').forEach(opt => {
        opt.addEventListener('click', () => {
            currentSelectedSub = opt.getAttribute('data-subname');
            // إزالة التحديد السابق
            document.querySelectorAll('.sub-option').forEach(o => o.classList.remove('selected'));
            opt.classList.add('selected');
            searchSubInput.value = currentSelectedSub; // يظهر في حقل البحث
        });
    });
}

// عندما يكتب المستخدم في البحث
searchSubInput.addEventListener('input', (e) => {
    renderSubItemsList(e.target.value);
});

// عند تغيير القسم (اختياري: إعادة تعيين التحديد)
modalExpenseCategory.addEventListener('change', () => {
    currentSelectedSub = "";
    searchSubInput.value = "";
    renderSubItemsList("");
});


function openModal() {
    modal.style.display = "flex";
    renderSubItemsList(""); // عرض القائمة كاملة
    currentSelectedSub = "";
    modalExpenseAmount.value = "";
    searchSubInput.value = "";
}
function closeModal() {
    modal.style.display = "none";
}
openModalBtn.addEventListener('click', openModal);
closeModalBtn.addEventListener('click', closeModal);
modalCancelBtn.addEventListener('click', closeModal);
// إغلاق عند النقر خارج المحتوى
modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
});
modalAddExpenseBtn.addEventListener('click', addExpenseFromModal);


/////////////////////////////////////////////////////////////////////////////////////////

let currentSelectedSub = ""; // لتخزين الصنف المختار

let currentUser = null;
let currentSettings = null;  // { income, percentages, customSubs }
let allTransactions = [];

// قائمة موحدة للأصناف (كل الأقسام تشترك فيها)
const unifiedSubcategories = [
    { name: "المواصلات العامة 🚌", emoji: "🚌" },
    { name: "تاكسي / أوبر 🚕", emoji: "🚕" },
    { name: "الطعام والشراب 🍔", emoji: "🍔" },
    { name: "المطاعم والكافيهات ☕", emoji: "☕" },
    { name: "الملابس 👕", emoji: "👕" },
    { name: "الإيجار 🏠", emoji: "🏠" },
    { name: "الفواتير الكهرباء والماء 💡", emoji: "💡" },
    { name: "الإنترنت والجوال 📱", emoji: "📱" },
    { name: "الترفيه (سينما، حفلات) 🎬", emoji: "🎬" },
    { name: "السفر والإجازات ✈️", emoji: "✈️" },
    { name: "التسوق عبر الإنترنت 🛍️", emoji: "🛍️" },
    { name: "الرياضة واللياقة 🏋️", emoji: "🏋️" },
    { name: "الرعاية الصحية 🩺", emoji: "🩺" },
    { name: "التعليم والدورات 📚", emoji: "📚" },
    { name: "الاستثمار (أسهم، صناديق) 📊", emoji: "📊" },
    { name: "العقار 🏢", emoji: "🏢" },
    { name: "المشاريع الناشئة 💼", emoji: "💼" },
    { name: "الهدايا والمناسبات 🎁", emoji: "🎁" },
    { name: "التجميل والعناية 💇", emoji: "💇" },
    { name: "أدوات التكنولوجيا 💻", emoji: "💻" },
    { name: "أخرى ✨", emoji: "✨" }
];

// دالة للحصول على القائمة (بدون تصنيف حسب القسم)
function getFullSubList(category) {
    // تجاهل category وجعلها موحدة
    let custom = (currentSettings?.customSubs || []).map(cs => ({ name: cs.name, emoji: "✨" }));
    return [...unifiedSubcategories, ...custom];
}

// function populateSubCategories() {
//     const subList = getFullSubList(); // لا حاجة لتمرير category
//     subCategorySelect.innerHTML = '';
//     subList.forEach(sub => {
//         const option = document.createElement('option');
//         option.value = sub.name;
//         option.textContent = sub.name;
//         subCategorySelect.appendChild(option);
//     });
//     customSubInput.style.display = 'none';
//     subCategorySelect.style.display = 'block';
// }

// // تبديل إضافة صنف مخصص
// toggleCustomBtn.addEventListener('click', () => {
//     if (customSubInput.style.display === 'none') {
//         customSubInput.style.display = 'block';
//         subCategorySelect.style.display = 'none';
//         customSubInput.value = '';
//         customSubInput.placeholder = "مثلاً: اشتراك شهري 🎧";
//         toggleCustomBtn.textContent = 'رجوع للقائمة';
//     } else {
//         customSubInput.style.display = 'none';
//         subCategorySelect.style.display = 'block';
//         toggleCustomBtn.textContent = '➕ إضافة مخصص';
//         // إذا كان المستخدم أدخل قيمة جديدة نقوم بحفظها كصنف مخصص لهذا القسم
//         const newSub = customSubInput.value.trim();
//         if (newSub !== "") {
//             saveCustomSubcategory(newSub);
//         }
//     }
// });

// async function saveCustomSubcategory(newSubName) {
//     if (!currentUser) return;
//     const currentCustoms = currentSettings?.customSubs || [];
//     if (currentCustoms.some(c => c.name === newSubName)) return;
//     const updatedCustoms = [...currentCustoms, { category: "unified", name: newSubName }];
//     const userSettingsRef = doc(db, "users", currentUser.uid);
//     await setDoc(userSettingsRef, { customSubs: updatedCustoms }, { merge: true });
//     currentSettings.customSubs = updatedCustoms;
//     populateSubCategories();
//     subCategorySelect.value = newSubName;
//     customSubInput.style.display = 'none';
//     subCategorySelect.style.display = 'block';
//     toggleCustomBtn.textContent = '➕ إضافة مخصص';
// }

// حساب المصروفات الشهرية الحالية حسب القسم
async function fetchTransactions() {
    if (!currentUser) return;
    const q = query(collection(db, "transactions"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    allTransactions = [];
    snapshot.forEach(doc => {
        allTransactions.push({ id: doc.id, ...doc.data() });
    });
    renderTransactionsList();
    updateBudgetUI();
}

function renderTransactionsList(filter = "all") {
    let filtered = allTransactions;
    if (filter !== "all") {
        filtered = allTransactions.filter(t => t.category === filter);
    }
    if (filtered.length === 0) {
        transactionsListDiv.innerHTML = '<div style="text-align:center;">📭 لا توجد حركات</div>';
        return;
    }
    const html = filtered.map(t => {
        const dateObj = t.createdAt?.toDate?.() || new Date();
        const dateStr = dateObj.toLocaleDateString('ar-EG');
        let catName = "";
        if (t.category === "essentials") catName = "🥗 أساسيات";
        else if (t.category === "wants") catName = "🎮 رفاهيات";
        else catName = "📈 استثمار";
        return `
            <div class="transaction-item">
                <div><i class="fas fa-receipt"></i> <strong>${t.subcategory}</strong><br><small>${catName} | ${dateStr}</small></div>
                <div style="font-weight:bold; color:#f0b90b;">- ${Number(t.amount).toFixed(2)} جنيه</div>
            </div>
        `;
    }).join('');
    transactionsListDiv.innerHTML = html;
}

// تحديث واجهة الميزانية والمبالغ المتبقية
async function updateBudgetUI() {
    if (!currentSettings || !currentSettings.income) {
        budgetOverview.innerHTML = '<div class="glass-card">لم تقم بإعداد الدخل بعد</div>';
        return;
    }
    const income = currentSettings.income;
    const perc = currentSettings.percentages;
    const allocated = {
        essentials: income * (perc.essentials / 100),
        wants: income * (perc.wants / 100),
        investments: income * (perc.investments / 100)
    };
    // حساب المصروفات الحالية للشهر الحالي (يمكن فلترة حسب الشهر الحالي)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startTimestamp = Timestamp.fromDate(startOfMonth);
    let spent = { essentials: 0, wants: 0, investments: 0 };
    for (let t of allTransactions) {
        if (t.createdAt && t.createdAt.toDate() >= startOfMonth) {
            spent[t.category] = (spent[t.category] || 0) + t.amount;
        }
    }
    const remaining = {
        essentials: allocated.essentials - spent.essentials,
        wants: allocated.wants - spent.wants,
        investments: allocated.investments - spent.investments
    };
    budgetOverview.innerHTML = `
        <div class="category-card" style="border-right-color: #42a5f5;">
            <h3><i class="fas fa-home"></i> الأساسيات</h3>
            <div>المخصص: ${allocated.essentials.toFixed(2)}  |  المستخدم: ${spent.essentials.toFixed(2)}</div>
            <div class="progress-bar"><div class="progress-fill" style="width: ${(spent.essentials/allocated.essentials)*100}%; background:#42a5f5;"></div></div>
            <div><strong>المتبقي: <span style="color:#f0b90b;">${remaining.essentials.toFixed(2)}</span></strong></div>
        </div>
        <div class="category-card" style="border-right-color: #ab47bc;">
            <h3><i class="fas fa-cocktail"></i> الرفاهيات</h3>
            <div>المخصص: ${allocated.wants.toFixed(2)}  |  المستخدم: ${spent.wants.toFixed(2)}</div>
            <div class="progress-bar"><div class="progress-fill" style="width: ${(spent.wants/allocated.wants)*100}%; background:#ab47bc;"></div></div>
            <div><strong>المتبقي: <span style="color:#f0b90b;">${remaining.wants.toFixed(2)}</span></strong></div>
        </div>
        <div class="category-card" style="border-right-color: #66bb6a;">
            <h3><i class="fas fa-chart-line"></i> الاستثمار</h3>
            <div>المخصص: ${allocated.investments.toFixed(2)}  |  المستخدم: ${spent.investments.toFixed(2)}</div>
            <div class="progress-bar"><div class="progress-fill" style="width: ${(spent.investments/allocated.investments)*100}%; background:#66bb6a;"></div></div>
            <div><strong>المتبقي: <span style="color:#f0b90b;">${remaining.investments.toFixed(2)}</span></strong></div>
        </div>
    `;
}

// حفظ إعدادات الدخل والنسب
async function saveSettings() {
    if (!currentUser) return;
    const income = parseFloat(monthlyIncomeInput.value);
    const essentials = parseFloat(essPercentInput.value);
    const wants = parseFloat(wantsPercentInput.value);
    const investments = parseFloat(investPercentInput.value);
    if (isNaN(income) || income <= 0) { alert("أدخل راتباً صحيحاً"); return; }
    if (essentials + wants + investments !== 100) {
        percentWarning.innerText = "⚠️ مجموع النسب يجب أن يساوي 100%";
        return;
    } else percentWarning.innerText = "";
    const percentages = { essentials, wants, investments };
    const userRef = doc(db, "users", currentUser.uid);
    await setDoc(userRef, { income, percentages }, { merge: true });
    currentSettings = { ...currentSettings, income, percentages };
    await fetchTransactions(); // تحديث
}

async function addExpenseFromModal() {
    if (!currentUser || !currentSettings?.income) {
        alert("يرجى حفظ إعدادات الدخل أولاً");
        return;
    }
    const category = modalExpenseCategory.value;
    let subcategory = currentSelectedSub;
    if (!subcategory) {
        // إذا لم يختر شيئاً، يمكننا إما منعه أو استخدام النص المكتوب في البحث كصنف جديد
        if (searchSubInput.value.trim() !== "") {
            subcategory = searchSubInput.value.trim();
            // هنا يمكنك إضافة الصنف المخصص إذا أردت (اختياري)
            // await saveCustomSubcategory(subcategory); // لو أردت حفظه تلقائياً
        } else {
            alert("الرجاء اختيار أو كتابة الصنف");
            return;
        }
    }
    const amount = parseFloat(modalExpenseAmount.value);
    if (isNaN(amount) || amount <= 0) {
        alert("أدخل مبلغاً صحيحاً");
        return;
    }
    
    await addDoc(collection(db, "transactions"), {
        userId: currentUser.uid,
        category: category,
        subcategory: subcategory,
        amount: amount,
        createdAt: Timestamp.now(),
    });
    
    // إعادة تعيين الحقول
    modalExpenseAmount.value = "";
    searchSubInput.value = "";
    currentSelectedSub = "";
    renderSubItemsList("");
    closeModal();
    await fetchTransactions(); // تحديث السجل والميزانية
}

// فلتر
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filterVal = btn.getAttribute('data-filter');
        renderTransactionsList(filterVal);
    });
});

// // استماع للتغيير على القسم لتحديث قائمة الأصناف
// expenseCategory.addEventListener('change', () => {
//     populateSubCategories();
// });

// تحميل بيانات المستخدم
async function loadUserData(user) {
    currentUser = user;
    userEmailSpan.innerText = user.email;
    const userDocRef = doc(db, "users", user.uid);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
        currentSettings = docSnap.data();
        monthlyIncomeInput.value = currentSettings.income || "";
        essPercentInput.value = currentSettings.percentages?.essentials || 50;
        wantsPercentInput.value = currentSettings.percentages?.wants || 30;
        investPercentInput.value = currentSettings.percentages?.investments || 20;
    } else {
        currentSettings = { income: null, percentages: { essentials: 50, wants: 30, investments: 20 }, customSubs: [] };
    }
    updateSettingsPanelVisibility();
    // populateSubCategories();
    await fetchTransactions();
}

// تسجيل الدخول والخروج
onAuthStateChanged(auth, async (user) => {
    if (user) {
        authSection.classList.add('hidden');
        dashboard.classList.remove('hidden');
        await loadUserData(user);
    } else {
        authSection.classList.remove('hidden');
        dashboard.classList.add('hidden');
    }
});
// زر نسيت كلمة المرور
const forgotBtn = document.getElementById('forgotPasswordBtn');
forgotBtn.addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    if (!email) {
        alert("يرجى إدخال بريدك الإلكتروني أولاً");
        return;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        alert(`تم إرسال رابط إعادة تعيين كلمة المرور إلى ${email}. تفقد بريدك (بما في ذلك spam).`);
    } catch (error) {
        let msg = "حدث خطأ. تأكد من صحة البريد وأن الحساب موجود.";
        if (error.code === 'auth/user-not-found') msg = "لا يوجد حساب مسجل بهذا البريد الإلكتروني.";
        else if (error.code === 'auth/invalid-email') msg = "صيغة البريد غير صحيحة.";
        alert(msg);
    }
});
document.getElementById('loginBtn').addEventListener('click', async () => {
    const email = document.getElementById('loginEmail').value;
    const pwd = document.getElementById('loginPassword').value;
    try {
        await signInWithEmailAndPassword(auth, email, pwd);
    } catch(e) { alert("خطأ: "+e.message); }
});
document.getElementById('signupBtn').addEventListener('click', async () => {
    const email = document.getElementById('signupEmail').value;
    const pwd = document.getElementById('signupPassword').value;
    try {
        await createUserWithEmailAndPassword(auth, email, pwd);
    } catch(e) { alert("خطأ: "+e.message); }
});
document.getElementById('showSignup').addEventListener('click', () => { loginFormDiv.classList.add('hidden'); signupFormDiv.classList.remove('hidden'); });
document.getElementById('showLogin').addEventListener('click', () => { signupFormDiv.classList.add('hidden'); loginFormDiv.classList.remove('hidden'); });
logoutBtn.addEventListener('click', () => signOut(auth));
saveSettingsBtn.addEventListener('click', saveSettings);
// addExpenseBtn.addEventListener('click', addExpense);
// إعدادات أولية

// التحكم في إظهار/إخفاء لوحة الإعدادات
const settingsPanel = document.getElementById('settingsPanel');
const toggleSettingsBtn = document.getElementById('toggleSettingsBtn');

function updateSettingsPanelVisibility() {
    if (currentSettings && currentSettings.income) {
        // إذا كان هناك راتب محفوظ، نخفي لوحة الإعدادات ونظهر زر التعديل فقط
        settingsPanel.style.display = 'none';
        toggleSettingsBtn.style.display = 'block';
        saveSettings()
    } else {
        settingsPanel.style.display = 'block';
        toggleSettingsBtn.style.display = 'block';
    }
}

// عند الضغط على زر التعديل
toggleSettingsBtn.addEventListener('click', () => {
    settingsPanel.style.display = 'block';
    // مرر إلى أعلى القسم
    document.getElementById('settingsCard').scrollIntoView({ behavior: 'smooth' });
});

// بعد حفظ الإعدادات بنجاح، نخفي اللوحة
const originalSaveSettings = saveSettings;
window.saveSettings = async function() {
    await originalSaveSettings();
    if (currentSettings && currentSettings.income) {
        settingsPanel.style.display = 'none';
    }
};
saveSettingsBtn.removeEventListener('click', saveSettings);
saveSettingsBtn.addEventListener('click', window.saveSettings);