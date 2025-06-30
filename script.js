// script.js
// تأكد من أن Firebase قد تمت تهيئته في firebase-config.js قبل هذا الملف

// ======================================
// وظائف مساعدة عامة
// ======================================
function showMessage(elementId, msg, isError = true) {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.textContent = msg;
        messageElement.className = `message ${isError ? 'error' : 'success'}`;
        messageElement.style.display = 'block';
    }
}

function hideMessage(elementId) {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.style.display = 'none';
    }
}

// ======================================
// index.html (صفحة المتجر الرئيسية وعرض المنتجات)
// ======================================
if (document.getElementById('products-container')) {
    const productsContainer = document.getElementById('products-container');

    // وظيفة لتحميل المنتجات
    function loadProducts() {
        productsContainer.innerHTML = '<div class="loading-message">جاري تحميل المنتجات...</div>';
        
        // يمكن جلب المنتجات من Firebase Realtime Database
        // مثال: database.ref('products').once('value')
        // أو من ملف JSON محلي في البداية لسهولة التجربة
        fetch('products.json') // تأكد من وجود ملف products.json
            .then(response => response.json())
            .then(products => {
                productsContainer.innerHTML = ''; // مسح رسالة التحميل
                if (products && products.length > 0) {
                    products.forEach(product => {
                        const productCard = `
                            <div class="product-card">
                                <img src="${product.imageUrl}" alt="${product.name}">
                                <div class="product-card-content">
                                    <h4>${product.name}</h4>
                                    <p>${product.description}</p>
                                    <span class="price">${product.price} ريال</span>
                                    <button class="btn btn-primary" onclick="alert('لشراء هذا المنتج، يرجى تسجيل الدخول أولاً.')">شراء الآن</button>
                                </div>
                            </div>
                        `;
                        productsContainer.innerHTML += productCard;
                    });
                } else {
                    productsContainer.innerHTML = '<p class="loading-message">لا توجد منتجات لعرضها حالياً.</p>';
                }
            })
            .catch(error => {
                console.error("Error loading products:", error);
                productsContainer.innerHTML = '<p class="loading-message error">حدث خطأ أثناء تحميل المنتجات. الرجاء المحاولة لاحقاً.</p>';
            });
    }

    loadProducts();
}


// ======================================
// login.html (تسجيل الدخول والتسجيل)
// ======================================
if (document.getElementById('loginBtn')) {
    const loginEmailInput = document.getElementById('loginEmail');
    const loginPasswordInput = document.getElementById('loginPassword');
    const loginBtn = document.getElementById('loginBtn');
    const loginMessageDisplay = document.getElementById('loginMessage');

    const registerNameInput = document.getElementById('registerName');
    const registerEmailInput = document.getElementById('registerEmail');
    const registerPasswordInput = document.getElementById('registerPassword');
    const referralCodeInput = document.getElementById('referralCode');
    const registerBtn = document.getElementById('registerBtn');
    const registerMessageDisplay = document.getElementById('registerMessage');

    // تسجيل الدخول
    loginBtn.addEventListener('click', () => {
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;
        hideMessage('loginMessage');

        if (!email || !password) {
            showMessage('loginMessage', 'الرجاء إدخال البريد الإلكتروني وكلمة المرور.', true);
            return;
        }

        auth.signInWithEmailAndPassword(email, password)
            .then((userCredential) => {
                // تسجيل الدخول بنجاح، توجيه المستخدم
                window.location.href = 'dashboard.html';
            })
            .catch((error) => {
                let errorMessage = 'فشل تسجيل الدخول: ';
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    errorMessage += 'البريد الإلكتروني أو كلمة المرور غير صحيحة.';
                } else {
                    errorMessage += error.message;
                }
                showMessage('loginMessage', errorMessage, true);
            });
    });

    // الانتساب / التسجيل
    registerBtn.addEventListener('click', () => {
        const name = registerNameInput.value;
        const email = registerEmailInput.value;
        const password = registerPasswordInput.value;
        const referralCode = referralCodeInput.value;
        hideMessage('registerMessage');

        if (!name || !email || !password || password.length < 8) {
            showMessage('registerMessage', 'الرجاء تعبئة جميع الحقول بشكل صحيح (كلمة السر 8 أحرف على الأقل).', true);
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const newUser = userCredential.user;
                const userId = newUser.uid;
                const usersRef = database.ref('users');

                const createNewUserInDB = (referrerId = '', referralPath = []) => {
                    const userData = {
                        id: userId,
                        name: name,
                        email: email,
                        points: 0,
                        level: 0,
                        memberId: "", // سيتم تعيينه عند الوصول للمستوى 1
                        referredBy: referrerId,
                        referralPath: referralPath, // مسار الإحالة للأجيال
                        directMembers: [], // الأعضاء المباشرين
                        level1ReferralsCount: 0, // عدد الأعضاء الذين وصلوا للمستوى 1 عبر إحالته
                        earnings: {} // الأرباح من الأجيال
                    };
                    usersRef.child(userId).set(userData)
                        .then(() => {
                            showMessage('registerMessage', 'تم التسجيل بنجاح! سيتم توجيهك الآن.', false);
                            setTimeout(() => {
                                window.location.href = 'dashboard.html';
                            }, 2000); // تأخير بسيط قبل التوجيه
                        })
                        .catch(dbError => {
                            showMessage('registerMessage', 'فشل حفظ بيانات المستخدم: ' + dbError.message, true);
                        });
                };

                if (referralCode) {
                    usersRef.orderByChild('memberId').equalTo(referralCode).once('value')
                        .then(snapshot => {
                            if (snapshot.exists()) {
                                let referrerId = '';
                                let referrerPath = [];
                                snapshot.forEach(childSnapshot => {
                                    referrerId = childSnapshot.key;
                                    const referrerData = childSnapshot.val();
                                    if (referrerData.referralPath) {
                                        referrerPath = [...referrerData.referralPath];
                                    }
                                });
                                // إضافة المرجع المباشر إلى المسار
                                // المسار يجب أن يبدأ بالمرجع المباشر
                                referrerPath.unshift(referrerId);
                                // تقليم المسار إلى 10 أجيال كحد أقصى (يمكنك تعديل هذا الرقم)
                                if (referrerPath.length > 10) {
                                    referrerPath = referrerPath.slice(0, 10);
                                }

                                // تحديث قائمة الأعضاء المباشرين للمرجع
                                const referrerDirectMembersRef = usersRef.child(referrerId).child('directMembers');
                                referrerDirectMembersRef.transaction((currentMembers) => {
                                    if (currentMembers === null) {
                                        return [userId];
                                    }
                                    if (!currentMembers.includes(userId)) {
                                        currentMembers.push(userId);
                                    }
                                    return currentMembers;
                                }, (error, committed, snapshot) => {
                                    if (error) {
                                        console.error("Transaction failed to update referrer directMembers: ", error);
                                    } else if (!committed) {
                                        console.log("Transaction not committed (aborted).");
                                    } else {
                                        console.log("Referrer directMembers updated successfully.");
                                    }
                                });
                                createNewUserInDB(referrerId, referrerPath);

                            } else {
                                showMessage('registerMessage', 'كود الإحالة غير صالح. سيتم تسجيلك كمستخدم عادي بدون مرجع.', true);
                                createNewUserInDB(); // تسجيل بدون مرجع
                            }
                        })
                        .catch(error => {
                            showMessage('registerMessage', 'خطأ في التحقق من كود الإحالة: ' + error.message, true);
                            createNewUserInDB(); // تسجيل بدون مرجع
                        });
                } else {
                    createNewUserInDB(); // تسجيل بدون مرجع
                }
            })
            .catch((error) => {
                let errorMessage = 'فشل التسجيل: ';
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage += 'هذا البريد الإلكتروني مستخدم بالفعل.';
                } else {
                    errorMessage += error.message;
                }
                showMessage('registerMessage', errorMessage, true);
            });
    });
}

// ======================================
// dashboard.html (لوحة تحكم المستخدم)
// ======================================
if (document.getElementById('logoutBtn')) {
    const userNameSpan = document.getElementById('userName');
    const userEmailSpan = document.getElementById('userEmail');
    const userPointsSpan = document.getElementById('userPoints');
    const userLevelSpan = document.getElementById('userLevel');
    const userMemberIdSpan = document.getElementById('userMemberId');
    const memberIdSection = document.getElementById('memberIdSection');
    const userReferredBySpan = document.getElementById('userReferredBy');
    const referredBySection = document.getElementById('referredBySection');
    const showReferralCodeBtn = document.getElementById('showReferralCodeBtn');
    const viewNetworkBtn = document.getElementById('viewNetworkBtn');
    const adminPanelLink = document.getElementById('adminPanelLink');
    const logoutBtn = document.getElementById('logoutBtn');

    // التحقق من حالة تسجيل الدخول عند تحميل الصفحة
    auth.onAuthStateChanged(user => {
        if (user) {
            const currentUserRef = database.ref('users').child(user.uid);
            currentUserRef.on('value', snapshot => { // استخدام on() لسماع التغييرات في الوقت الفعلي
                const userData = snapshot.val();
                if (userData) {
                    userNameSpan.textContent = userData.name || 'غير معروف';
                    userEmailSpan.textContent = userData.email || user.email;
                    userPointsSpan.textContent = userData.points || 0;
                    userLevelSpan.textContent = userData.level || 0;

                    if (userData.level >= 1 && userData.memberId) { // يظهر رقم الملكية وزر كود الإحالة عند المستوى 1
                        userMemberIdSpan.textContent = userData.memberId;
                        memberIdSection.style.display = 'block';
                        showReferralCodeBtn.style.display = 'inline-block';
                        viewNetworkBtn.style.display = 'inline-block'; // إظهار زر عرض الشبكة
                    } else {
                        memberIdSection.style.display = 'none';
                        showReferralCodeBtn.style.display = 'none';
                        viewNetworkBtn.style.display = 'none';
                    }

                    if (userData.referredBy && userData.referredBy !== "") {
                        database.ref('users').child(userData.referredBy).once('value', referrerSnapshot => {
                            const referrerData = referrerSnapshot.val();
                            if (referrerData) {
                                userReferredBySpan.textContent = referrerData.name;
                            } else {
                                userReferredBySpan.textContent = "غير معروف";
                            }
                            referredBySection.style.display = 'block';
                        });
                    } else {
                        referredBySection.style.display = 'none';
                    }

                    // صلاحيات المشرف
                    // الـ UID الخاص بك كمالك: 773685428 (هذا هو رقمك السري للدخول)
                    // **ملاحظة هامة:** هذا ليس الـ UID الفعلي الخاص بك في Firebase.
                    // أنت تحتاج لإنشاء حساب لك بكلمة المرور هذه (773685428) في Firebase Authentication.
                    // ثم تأخذ الـ UID (المعرف الفريد) لذلك الحساب من Firebase Console وتضعه هنا.
                    // الأفضل هو تخزين الـ UID الخاص بك في عقدة 'admin_users' في Firebase Realtime Database
                    // والتحقق منه هناك.
                    // سأفترض أنك وضعت الـ UID الخاص بك في 'admin_users'
                    // مثال: database.ref('admin_users').child('YOUR_ACTUAL_ADMIN_UID').set(true);
                    
                    database.ref('admin_users').child(user.uid).once('value', adminSnapshot => {
                        if (adminSnapshot.exists()) {
                            adminPanelLink.style.display = 'inline-block'; // إظهار رابط لوحة المشرف
                        } else {
                            adminPanelLink.style.display = 'none';
                        }
                    });

                } else {
                    console.warn("User data not found in database for UID:", user.uid);
                    alert("يبدو أن بيانات حسابك غير مكتملة. الرجاء التواصل مع الدعم.");
                    auth.signOut(); // تسجيل الخروج لتجنب المشاكل
                    window.location.href = 'login.html';
                }
            }, (errorObject) => {
                console.error("Error reading user data:", errorObject.code);
                alert("حدث خطأ أثناء تحميل بياناتك. الرجاء المحاولة لاحقاً.");
                auth.signOut();
                window.location.href = 'login.html';
            });
        } else {
            // المستخدم غير مسجل الدخول، إعادة التوجيه لصفحة تسجيل الدخول
            window.location.href = 'login.html';
        }
    });

    logoutBtn.addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error("فشل تسجيل الخروج:", error);
            alert("حدث خطأ أثناء تسجيل الخروج. الرجاء المحاولة لاحقاً.");
        });
    });

    showReferralCodeBtn.addEventListener('click', () => {
        alert("كود الإحالة الخاص بك هو: " + userMemberIdSpan.textContent + "\n شارك هذا الكود مع أصدقائك!");
    });

    viewNetworkBtn.addEventListener('click', () => {
        // يمكنك توجيه المستخدم لصفحة لعرض شبكته التسويقية
        alert("وظيفة عرض الشبكة التسويقية هنا (تتطلب صفحة جديدة ومنطق برمجي).");
        // window.location.href = 'network.html'; // تحتاج لإنشاء صفحة network.html
    });
}


// ======================================
// admin.html (لوحة تحكم المالك/المشرف)
// ======================================
if (document.getElementById('adminLogoutBtn')) {
    const newUserNameInput = document.getElementById('newUserName');
    const newUserEmailInput = document.getElementById('newUserEmail');
    const newUserPasswordInput = document.getElementById('newUserPassword');
    const newUserReferralCodeInput = document.getElementById('newUserReferralCode');
    const addUserBtn = document.getElementById('addUserBtn');
    const addUserMessage = document.getElementById('addUserMessage');
    const usersListUl = document.getElementById('usersList');
    const userSearchInput = document.getElementById('userSearch');
    const promoteSelectedUsersBtn = document.getElementById('promoteSelectedUsersBtn');
    const exportUsersBtn = document.getElementById('exportUsersBtn');

    let allUsersData = []; // لتخزين بيانات المستخدمين الحالية

    // التحقق من صلاحيات المشرف عند تحميل صفحة المشرف
    auth.onAuthStateChanged(user => {
        if (user) {
            // **هنا يجب أن تضع الـ UID الفعلي لحسابك أنت كمالك في Firebase.**
            // أنا سأفترض أنك قمت بإضافة الـ UID الخاص بحسابك (الذي أنشأته بكلمة السر 773685428)
            // إلى عقدة `admin_users` في Firebase DB.
            const ADMIN_UID = user.uid; // في هذه الحالة، يمكننا ببساطة التحقق من UID المستخدم المسجل حاليًا
                                      // إذا كان هو نفسه الـ UID الخاص بك الذي قمت بتعيينه كمسؤول.
                                      // الأفضل: database.ref('admin_users').child(user.uid).once('value')

            database.ref('admin_users').child(user.uid).once('value', adminSnapshot => {
                if (!adminSnapshot.exists()) {
                    alert("ليس لديك صلاحيات الوصول إلى لوحة تحكم المشرف. سيتم توجيهك إلى لوحة المستخدم.");
                    window.location.href = 'dashboard.html'; // إعادة التوجيه إذا لم يكن مشرفاً
                } else {
                    loadAllUsers(); // تحميل المستخدمين بعد التأكد من الصلاحيات
                }
            });
        } else {
            window.location.href = 'login.html'; // إعادة التوجيه لصفحة تسجيل الدخول إذا لم يكن هناك مستخدم مسجل
        }
    });

    document.getElementById('adminLogoutBtn').addEventListener('click', () => {
        auth.signOut().then(() => {
            window.location.href = 'login.html';
        }).catch((error) => {
            console.error("فشل تسجيل الخروج من لوحة المشرف:", error);
            alert("حدث خطأ أثناء تسجيل الخروج. الرجاء المحاولة لاحقاً.");
        });
    });

    // إضافة مستخدم جديد من لوحة المشرف
    addUserBtn.addEventListener('click', () => {
        const name = newUserNameInput.value;
        const email = newUserEmailInput.value;
        const password = newUserPasswordInput.value;
        const referralCode = newUserReferralCodeInput.value;
        hideMessage('addUserMessage');

        if (!name || !email || !password || password.length < 8) {
            showMessage('addUserMessage', 'الرجاء تعبئة جميع الحقول بشكل صحيح (كلمة السر 8 أحرف على الأقل).', true);
            return;
        }

        // إنشاء المستخدم عبر Firebase Authentication
        auth.createUserWithEmailAndPassword(email, password)
            .then((userCredential) => {
                const newUser = userCredential.user;
                const userId = newUser.uid;
                const usersRef = database.ref('users');

                const createNewUserInDB = (referrerId = '', referralPath = []) => {
                    const userData = {
                        id: userId,
                        name: name,
                        email: email,
                        points: 0,
                        level: 0,
                        memberId: "",
                        referredBy: referrerId,
                        referralPath: referralPath,
                        directMembers: [],
                        level1ReferralsCount: 0,
                        earnings: {}
                    };
                    usersRef.child(userId).set(userData)
                        .then(() => {
                            showMessage('addUserMessage', 'تمت إضافة المستخدم بنجاح!', false);
                            newUserNameInput.value = '';
                            newUserEmailInput.value = '';
                            newUserPasswordInput.value = '';
                            newUserReferralCodeInput.value = '';
                            loadAllUsers(); // تحديث قائمة المستخدمين
                        })
                        .catch(dbError => {
                            showMessage('addUserMessage', 'فشل حفظ بيانات المستخدم: ' + dbError.message, true);
                        });
                };

                if (referralCode) {
                    usersRef.orderByChild('memberId').equalTo(referralCode).once('value')
                        .then(snapshot => {
                            if (snapshot.exists()) {
                                let referrerId = '';
                                let referrerPath = [];
                                snapshot.forEach(childSnapshot => {
                                    referrerId = childSnapshot.key;
                                    const referrerData = childSnapshot.val();
                                    if (referrerData.referralPath) {
                                        referrerPath = [...referrerData.referralPath];
                                    }
                                });
                                referrerPath.unshift(referrerId);
                                if (referrerPath.length > 10) {
                                    referrerPath = referrerPath.slice(0, 10);
                                }
                                const referrerDirectMembersRef = usersRef.child(referrerId).child('directMembers');
                                referrerDirectMembersRef.transaction((currentMembers) => {
                                    if (currentMembers === null) {
                                        return [userId];
                                    }
                                    if (!currentMembers.includes(userId)) {
                                        currentMembers.push(userId);
                                    }
                                    return currentMembers;
                                }, (error, committed, snapshot) => {
                                    if (error) {
                                        console.error("Transaction failed to update referrer directMembers: ", error);
                                    } else if (!committed) {
                                        console.log("Transaction not committed (aborted).");
                                    } else {
                                        console.log("Referrer directMembers updated successfully.");
                                    }
                                });
                                createNewUserInDB(referrerId, referrerPath);

                            } else {
                                showMessage('addUserMessage', 'كود الإحالة غير صالح. تم إضافة المستخدم كمستخدم عادي.', true);
                                createNewUserInDB();
                            }
                        })
                        .catch(error => {
                            showMessage('addUserMessage', 'خطأ في التحقق من كود الإحالة: ' + error.message, true);
                            createNewUserInDB();
                        });
                } else {
                    createNewUserInDB();
                }
            })
            .catch((error) => {
                let errorMessage = 'فشل إنشاء المستخدم: ';
                if (error.code === 'auth/email-already-in-use') {
                    errorMessage += 'هذا البريد الإلكتروني مستخدم بالفعل.';
                } else {
                    errorMessage += error.message;
                }
                showMessage('addUserMessage', errorMessage, true);
            });
    });

    // تحميل وعرض جميع المستخدمين
    function loadAllUsers(searchTerm = '') {
        database.ref('users').on('value', snapshot => {
            usersListUl.innerHTML = ''; // مسح القائمة الحالية
            allUsersData = []; // تفريغ البيانات القديمة

            snapshot.forEach(childSnapshot => {
                const user = childSnapshot.val();
                // فلترة بناءً على مصطلح البحث
                const matchesSearch = searchTerm === '' || 
                                      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                                      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));

                if (matchesSearch) {
                    allUsersData.push(user);
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <div class="user-details">
                            <strong>${user.name}</strong> (${user.email})<br>
                            المستوى: ${user.level || 0}, النقاط: ${user.points || 0}<br>
                            رقم الملكية: ${user.memberId || 'لا يوجد'}<br>
                            أعضاء المستوى 1: ${user.level1ReferralsCount || 0}
                        </div>
                        <input type="checkbox" data-uid="${user.id}">
                    `;
                    usersListUl.appendChild(li);
                }
            });

            if (allUsersData.length === 0 && searchTerm === '') {
                usersListUl.innerHTML = '<li style="justify-content: center;">لا يوجد مستخدمون مسجلون بعد.</li>';
            } else if (allUsersData.length === 0 && searchTerm !== '') {
                usersListUl.innerHTML = '<li style="justify-content: center;">لا توجد نتائج لبحثك.</li>';
            }
        });
    }

    // البحث في المستخدمين
    userSearchInput.addEventListener('input', (event) => {
        loadAllUsers(event.target.value);
    });

    // ترقية المستخدمين المحددين
    promoteSelectedUsersBtn.addEventListener('click', () => {
        const checkboxes = usersListUl.querySelectorAll('input[type="checkbox"]:checked');
        if (checkboxes.length === 0) {
            alert('الرجاء تحديد مستخدم واحد على الأقل للترقية.');
            return;
        }

        if (confirm(`هل أنت متأكد من ترقية ${checkboxes.length} مستخدمين محددين؟`)) {
            checkboxes.forEach(checkbox => {
                const userId = checkbox.dataset.uid;
                promoteUser(userId);
            });
        }
    });

    // وظيفة ترقية المستخدم
    function promoteUser(userId) {
        database.ref('users').child(userId).once('value', snapshot => {
            const user = snapshot.val();
            if (user && user.level < 10) { // يمكن تعديل الحد الأقصى للمستوى
                const newLevel = user.level + 1;
                let updateData = { level: newLevel };

                // إذا تمت الترقية للمستوى 1 ولم يكن لديه رقم عضوية، يتم إنشاء رقم عضوية له
                if (newLevel === 1 && !user.memberId) {
                    // توليد رقم ملكية فريد: (MEM-السنة-رقم عشوائي من 5 خانات)
                    const memberId = "MEM-" + new Date().getFullYear() + "-" + String(Math.floor(Math.random() * 100000)).padStart(5, '0');
                    updateData.memberId = memberId;
                    alert(`تم ترقية ${user.name} إلى المستوى 1! رقم عضويته هو: ${memberId}`);
                } else {
                    alert(`تم ترقية ${user.name} إلى المستوى ${newLevel}`);
                }

                database.ref('users').child(userId).update(updateData)
                    .then(() => {
                        console.log(`User ${user.name} (ID: ${userId}) promoted to Level ${newLevel}`);
                    })
                    .catch(error => {
                        alert(`فشل ترقية ${user.name}: ${error.message}`);
                    });
            } else if (user && user.level >= 10) {
                alert(`${user.name} هو بالفعل في المستوى الأعلى.`);
            }
        });
    }

    // تصدير بيانات المستخدمين (يعتمد على مكتبة SheetJS لتصدير Excel فعلياً)
    exportUsersBtn.addEventListener('click', () => {
        if (allUsersData.length === 0) {
            alert('لا توجد بيانات مستخدمين للتصدير.');
            return;
        }

        // هذا مثال بسيط جداً لتصدير JSON.
        // لتصدير Excel فعلاً، تحتاج إلى تضمين مكتبة مثل SheetJS وتطبيق منطق التصدير.
        // مثال على استخدام SheetJS (تحتاج لتضمينها في HTML):
        // <script src="https://unpkg.com/xlsx/dist/xlsx.full.min.js"></script>

        alert("تصدير البيانات سيقوم بتنزيل ملف JSON. لتصدير Excel، تحتاج إلى مكتبة خارجية.");
        const jsonData = JSON.stringify(allUsersData, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'users_data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });

    // ======================================
    // منطق نظام النقاط والمستويات (للتوضيح - يفضل أن يكون في Cloud Functions)
    // ======================================

    // دالة وهمية لمحاكاة عملية بيع وتحويل النقاط
    // في الواقع، هذه الدالة يجب أن تُستدعى من الواجهة الأمامية عند إتمام عملية شراء حقيقية،
    // ولكن الأهم هو أن المنطق الفعلي لتوزيع النقاط يجب أن يكون في Firebase Cloud Functions
    // لضمان الأمان والنزاهة.
    window.simulateSale = function(productId, profitAmount) { // جعلها دالة عامة
        if (!auth.currentUser) {
            alert("الرجاء تسجيل الدخول لإتمام عملية الشراء.");
            return;
        }
        const buyerId = auth.currentUser.uid;
        const pointsEarned = Math.floor(profitAmount / 100); // مثال: كل 100 ريال ربح = نقطة واحدة

        alert(`جاري معالجة شراء منتج ${productId} بربح ${profitAmount} ريال. ستكسب ${pointsEarned} نقطة.`);

        // 1. تحديث نقاط المشتري/البائع (المستخدم الحالي)
        updateUserPointsAndEarnings(buyerId, pointsEarned, 0, profitAmount);

        // 2. توزيع النقاط والأرباح على سلسلة الإحالة (الأجيال)
        distributePointsToUpline(buyerId, pointsEarned, profitAmount);

        // 3. تسجيل المعاملة في قاعدة البيانات (للسجلات)
        database.ref('transactions').push({
            userId: buyerId,
            productId: productId,
            profit: profitAmount,
            points: pointsEarned,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        }).then(() => {
            console.log("Transaction recorded successfully.");
        }).catch(error => {
            console.error("Error recording transaction:", error);
        });
    }

    function updateUserPointsAndEarnings(userId, pointsToAdd, generation, commissionAmount) {
        const userRef = database.ref('users').child(userId);
        userRef.transaction(currentData => {
            let user = currentData;
            if (user === null) return user; // لم يتم العثور على المستخدم

            user.points = (user.points || 0) + pointsToAdd;

            let earnings = user.earnings || {};
            const generationKey = `generation_${generation}`; // جيل 0 للمشتري، جيل 1 للمرجع المباشر وهكذا
            earnings[generationKey] = (earnings[generationKey] || 0) + commissionAmount;
            user.earnings = earnings;

            return user;
        }, (error, committed, snapshot) => {
            if (error) {
                console.error(`Transaction failed for user ${userId}: `, error);
            } else if (!committed) {
                console.log(`Transaction aborted for user ${userId}.`);
            } else {
                console.log(`Updated points and earnings for ${userId}. New points: ${snapshot.val().points}`);
                checkLevelUpgrade(userId, snapshot.val()); // التحقق من الترقية بعد التحديث
            }
        });
    }

    function distributePointsToUpline(sellerId, basePoints, baseProfit) {
        database.ref('users').child(sellerId).once('value')
            .then(snapshot => {
                const seller = snapshot.val();
                if (!seller || !seller.referralPath || seller.referralPath.length === 0) {
                    console.log("No referral path for distribution.");
                    return;
                }

                // نسب الأرباح والنقاط للأجيال (يمكن تعديلها)
                // جيل 1 (مباشر) 10%، جيل 2 8% وهكذا
                const percentages = [0.10, 0.08, 0.06, 0.04, 0.02, 0.01]; // لـ 6 أجيال كحد أقصى

                seller.referralPath.slice(0, percentages.length).forEach((uplineId, index) => {
                    const percentage = percentages[index];
                    const pointsToAdd = Math.floor(basePoints * percentage);
                    const commissionAmount = baseProfit * percentage;

                    updateUserPointsAndEarnings(uplineId, pointsToAdd, index + 1, commissionAmount);
                });
            })
            .catch(error => {
                console.error("Error fetching seller referral path for distribution: ", error);
            });
    }

    // وظيفة التحقق من ترقية المستوى
    function checkLevelUpgrade(userId, user) {
        if (!user) return;

        // ترقية للمستوى 1 (100 نقطة)
        if (user.points >= 100 && user.level === 0) {
            promoteToLevel1(userId, user);
        }
        // ترقية للمستويات الأعلى (تعتمد على عدد أعضاء المستوى 1 المباشرين)
        else if (user.level >= 1 && user.level < 10) { // يمكن تعديل الحد الأقصى للمستوى
            // عدد أعضاء المستوى 1 المطلوب للترقية: 3 للمستوى 2، 9 للمستوى 3 وهكذا (3^المستوى الحالي)
            const requiredLevel1Members = Math.pow(3, user.level); 
            if ((user.level1ReferralsCount || 0) >= requiredLevel1Members) {
                promoteToNextLevel(userId, user.level);
            }
        }
    }

    // ترقية المستخدم إلى المستوى 1 (ومنحه رقم ملكية)
    function promoteToLevel1(userId, user) {
        const userRef = database.ref('users').child(userId);
        // توليد رقم ملكية فريد: MEM-السنة-رقم عشوائي من 5 خانات
        const memberId = "MEM-" + new Date().getFullYear() + "-" + String(Math.floor(Math.random() * 100000)).padStart(5, '0');

        userRef.update({
            level: 1,
            memberId: memberId
        }).then(() => {
            console.log(`User ${user.name} promoted to Level 1. Member ID: ${memberId}`);
            alert(`تهانينا يا ${user.name}! لقد وصلت إلى المستوى 1! رقم عضويتك هو: ${memberId}. يمكنك الآن البدء بدعوة أعضاء جدد!`);

            // تحديث عداد أعضاء المستوى 1 للمرجع (إن وجد)
            if (user.referredBy && user.referredBy !== "") {
                incrementReferrerLevel1Count(user.referredBy);
            }
        }).catch(error => {
            console.error(`Failed to promote ${userId} to Level 1: `, error);
            alert(`فشل ترقية ${user.name} إلى المستوى 1: ${error.message}`);
        });
    }

    // زيادة عدد أعضاء المستوى 1 للمرجع
    function incrementReferrerLevel1Count(referrerId) {
        const referrerRef = database.ref('users').child(referrerId).child('level1ReferralsCount');
        referrerRef.transaction(currentCount => {
            return (currentCount || 0) + 1;
        }, (error, committed, snapshot) => {
            if (committed) {
                console.log(`Referrer ${referrerId} level1ReferralsCount incremented. New count: ${snapshot.val()}`);
                // بعد زيادة العداد، تحقق إذا كان المرجع مؤهلاً لترقية المستوى
                database.ref('users').child(referrerId).once('value', referrerSnapshot => {
                    const referrer = referrerSnapshot.val();
                    if (referrer) {
                        checkLevelUpgrade(referrerId, referrer);
                    }
                });
            } else {
                console.error(`Failed to increment level1ReferralsCount for ${referrerId}: `, error);
            }
        });
    }

    // ترقية المستخدم إلى المستوى التالي (2 فما فوق)
    function promoteToNextLevel(userId, currentLevel) {
        const newLevel = currentLevel + 1;
        database.ref('users').child(userId).update({ level: newLevel })
            .then(() => {
                console.log(`User ${userId} promoted to Level ${newLevel}`);
                alert(`تهانينا! لقد وصلت إلى المستوى ${newLevel}!`);
            })
            .catch(error => {
                console.error(`Failed to promote ${userId} to Level ${newLevel}: `, error);
                alert(`فشل ترقية المستخدم إلى المستوى ${newLevel}: ${error.message}`);
            });
    }
}

// ======================================
// إنشاء المالك الأول (لك يا أسامة)
// ======================================
// **مهم جدًا:**
// نفذ هذا الجزء مرة واحدة فقط لإنشاء حسابك كمالك في Firebase Authentication
// وإضافته كمسؤول في قاعدة البيانات.
// بعد التنفيذ الناجح، يمكنك حذف هذا الجزء من الكود أو التعليق عليه لضمان الأمان.
// ستحتاج إلى إزالة التعليق عن هذا الكود وتشغيله يدويًا (مثلاً من خلال Console المتصفح)
// أو تضمينه مؤقتًا في script.js ثم حذفه بعد استخدامه.


function createInitialAdminUser() {
    const adminEmail = "osamaabdalkader100@gmail.com";
    const adminPassword = "773685428"; // كلمة المرور التي حددتها

    auth.createUserWithEmailAndPassword(adminEmail, adminPassword)
        .then((userCredential) => {
            const adminUser = userCredential.user;
            const adminUid = adminUser.uid;

            // إضافة بيانات المالك إلى عقدة المستخدمين
            database.ref('users').child(adminUid).set({
                id: adminUid,
                name: "أسامة عبدالقادر سعيد عبدالالة",
                email: adminEmail,
                points: 0,
                level: 0,
                memberId: "",
                referredBy: "",
                referralPath: [],
                directMembers: [],
                level1ReferralsCount: 0,
                earnings: {}
            }).then(() => {
                // إضافة الـ UID الخاص بالمالك إلى عقدة المسؤولين
                database.ref('admin_users').child(adminUid).set(true)
                    .then(() => {
                        console.log("Admin user created successfully and marked as admin!");
                        console.log("Admin UID:", adminUid);
                        alert("تم إنشاء حساب المالك بنجاح! يمكنك الآن تسجيل الدخول.");
                    })
                    .catch(error => {
                        console.error("Error setting admin permissions:", error);
                        alert("حدث خطأ في تعيين صلاحيات المالك.");
                    });
            }).catch(error => {
                console.error("Error creating admin user data:", error);
                alert("حدث خطأ في حفظ بيانات المالك.");
            });
        })
        .catch((error) => {
            console.error("Error creating initial admin account:", error);
            if (error.code === 'auth/email-already-in-use') {
                alert("حساب المالك موجود بالفعل. يمكنك تسجيل الدخول.");
            } else {
                alert("فشل إنشاء حساب المالك: " + error.message);
            }
        });
}

// يمكنك استدعاء هذه الدالة مرة واحدة فقط.
// مثلاً، في نافذة Console الخاصة بالمتصفح بعد تحميل صفحة login.html
// اكتب: createInitialAdminUser();
// أو قم بإزالة التعليق عن السطر التالي مؤقتاً وشغل الموقع:
// createInitialAdminUser();
*/
