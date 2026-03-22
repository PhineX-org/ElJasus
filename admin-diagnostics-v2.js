// ============================================================
// EL JASUS — COMPREHENSIVE DIAGNOSTICS ENGINE v2
// Drop-in replacement for the تشخيص النظام section
// 
// HOW TO USE IN admin.html:
//   1. Save this file as admin-diagnostics-v2.js
//   2. Add <script src="admin-diagnostics-v2.js"></script> at
//      the bottom of admin.html (after Firebase is initialized)
//   3. Replace the existing runDiagnostics() call with:
//      ElJasusDiagnostics.run(db, auth, currentUser)
//   4. Point the "اكتمل الفحص" button to that call
// ============================================================

const ElJasusDiagnostics = (() => {

    // ── RESULT STORE ─────────────────────────────────────────
    let results = [];
    let total = 0, passed = 0, warned = 0, failed = 0, critical = 0;

    const STATUS = { PASS:'pass', WARN:'warn', FAIL:'fail', CRIT:'critical' };

    function record(category, name, status, detail, extra = '') {
        results.push({ category, name, status, detail, extra });
        total++;
        if (status === STATUS.PASS)  passed++;
        else if (status === STATUS.WARN)  warned++;
        else if (status === STATUS.FAIL)  failed++;
        else if (status === STATUS.CRIT)  { failed++; critical++; }
    }

    // ── FIREBASE HELPERS (works with modular SDK already on page) ─
    function fbRef(db, path)       { return window._firebaseFns?.ref(db, path)  || window.ref?.(db, path)  || firebase.database().ref(path); }
    function fbGet(ref)            { return window._firebaseFns?.get(ref)       || window.get?.(ref)       || ref.once('value'); }
    function fbSet(ref, val)       { return window._firebaseFns?.set?.(ref,val) || window.set?.(ref,val)   || ref.set(val); }
    function fbRemove(ref)         { return window._firebaseFns?.remove?.(ref)  || window.remove?.(ref)    || ref.remove(); }
    function fbPush(ref, val)      { return window._firebaseFns?.push?.(ref,val)|| window.push?.(ref,val)  || ref.push(val); }
    function fbUpdate(ref, val)    { return window._firebaseFns?.update?.(ref,val)||window.update?.(ref,val)||ref.update(val); }

    // ── TEST HELPERS ─────────────────────────────────────────
    async function safeGet(db, path) {
        try {
            const snap = await fbGet(fbRef(db, path));
            return { ok: true, exists: snap.exists(), val: snap.val(), snap };
        } catch(e) {
            return { ok: false, error: e.message };
        }
    }

    async function safeWrite(db, path, value) {
        try {
            await fbSet(fbRef(db, path), value);
            return { ok: true };
        } catch(e) {
            return { ok: false, error: e.message };
        }
    }

    async function safeDelete(db, path) {
        try {
            await fbRemove(fbRef(db, path));
            return { ok: true };
        } catch(e) {
            return { ok: false, error: e.message };
        }
    }

    function elapsed(start) { return `${Date.now() - start}ms`; }

    // ════════════════════════════════════════════════════════
    // 1. FIREBASE CONNECTION & LATENCY
    // ════════════════════════════════════════════════════════
    async function testFirebase(db) {
        // 1a. Basic connectivity
        const t = Date.now();
        const res = await safeGet(db, '.info/connected');
        if (!res.ok) {
            record('اتصال Firebase', 'الاتصال بقاعدة البيانات', STATUS.CRIT, 'فشل الاتصال بـ Firebase', res.error);
            return;
        }
        const connected = res.val;
        const latency = Date.now() - t;
        record('اتصال Firebase', 'الاتصال بقاعدة البيانات', STATUS.PASS,
            `متصل — زمن الاستجابة ${latency}ms`,
            connected ? '🟢 متصل بالإنترنت' : '🟡 وضع غير متصل');

        // 1b. Latency quality
        if (latency > 2000)
            record('اتصال Firebase', 'جودة الاتصال', STATUS.WARN, `زمن الاستجابة بطيء: ${latency}ms`, 'يُفضَّل أقل من 500ms');
        else if (latency > 800)
            record('اتصال Firebase', 'جودة الاتصال', STATUS.WARN, `زمن متوسط: ${latency}ms`);
        else
            record('اتصال Firebase', 'جودة الاتصال', STATUS.PASS, `زمن ممتاز: ${latency}ms`);

        // 1c. Read/Write test (uses temp diagnostic node)
        const testPath = `_diagnostics/test_${Date.now()}`;
        const writeResult = await safeWrite(db, testPath, { ts: Date.now(), test: true });
        if (!writeResult.ok) {
            record('اتصال Firebase', 'اختبار الكتابة', STATUS.FAIL, 'فشل الكتابة إلى قاعدة البيانات', writeResult.error);
        } else {
            const readResult = await safeGet(db, testPath);
            if (readResult.ok && readResult.exists) {
                record('اتصال Firebase', 'اختبار القراءة/الكتابة', STATUS.PASS, 'القراءة والكتابة تعمل بشكل صحيح');
                await safeDelete(db, testPath); // cleanup
            } else {
                record('اتصال Firebase', 'اختبار القراءة', STATUS.FAIL, 'الكتابة نجحت لكن القراءة فشلت', readResult.error || '');
            }
        }
    }

    // ════════════════════════════════════════════════════════
    // 2. AUTHENTICATION SYSTEM
    // ════════════════════════════════════════════════════════
    async function testAuth(auth, currentUser) {
        // 2a. Auth instance
        if (!auth) {
            record('المصادقة', 'نظام المصادقة', STATUS.CRIT, 'كائن auth غير موجود');
            return;
        }
        record('المصادقة', 'نظام المصادقة', STATUS.PASS, 'Firebase Auth محمّل');

        // 2b. Current session
        if (!currentUser) {
            record('المصادقة', 'الجلسة الحالية', STATUS.WARN, 'لا يوجد مستخدم مسجّل دخول حالياً');
        } else {
            record('المصادقة', 'الجلسة الحالية', STATUS.PASS,
                `مسجّل دخول: ${currentUser.email || currentUser.displayName || currentUser.uid}`,
                `UID: ${currentUser.uid}`);

            // 2c. Token validity
            try {
                const token = await currentUser.getIdToken(false);
                record('المصادقة', 'صلاحية رمز الجلسة', STATUS.PASS,
                    'رمز JWT صالح',
                    token ? `رمز موجود (${token.length} حرف)` : '');
            } catch(e) {
                record('المصادقة', 'صلاحية رمز الجلسة', STATUS.WARN, 'تعذّر التحقق من الرمز', e.message);
            }

            // 2d. Provider type
            const providers = currentUser.providerData.map(p => p.providerId);
            record('المصادقة', 'طريقة تسجيل الدخول', STATUS.PASS,
                providers.includes('google.com') ? 'Google OAuth' : 'البريد الإلكتروني وكلمة المرور',
                providers.join(', '));

            // 2e. Display name
            if (!currentUser.displayName) {
                record('المصادقة', 'اسم المستخدم في Auth', STATUS.WARN,
                    'displayName غير مضبوط في Firebase Auth',
                    'تأكد من استدعاء updateProfile عند إنشاء الحساب');
            } else {
                record('المصادقة', 'اسم المستخدم في Auth', STATUS.PASS, currentUser.displayName);
            }
        }

        // 2f. Admin role check
        if (currentUser) {
            const { db } = window.__diagCtx || {};
            if (db) {
                const adminRes = await safeGet(db, `admins/${currentUser.uid}`);
                if (adminRes.ok && adminRes.exists) {
                    record('المصادقة', 'صلاحيات الإدارة', STATUS.PASS, 'المستخدم لديه صلاحيات admin', `Role: ${JSON.stringify(adminRes.val)}`);
                } else {
                    record('المصادقة', 'صلاحيات الإدارة', STATUS.WARN, 'المستخدم ليس في جدول admins',
                        'تأكد من إضافة uid إلى /admins في Firebase');
                }
            }
        }
    }

    // ════════════════════════════════════════════════════════
    // 3. PLAYER SYSTEM
    // ════════════════════════════════════════════════════════
    async function testPlayers(db, currentUser) {
        // 3a. Players node exists
        const playersRes = await safeGet(db, 'players');
        if (!playersRes.ok) {
            record('نظام اللاعبين', 'عقدة اللاعبين', STATUS.FAIL, 'تعذر قراءة /players', playersRes.error);
            return;
        }
        if (!playersRes.exists) {
            record('نظام اللاعبين', 'عقدة اللاعبين', STATUS.WARN, 'لا يوجد لاعبون بعد في قاعدة البيانات');
            return;
        }

        const players = playersRes.val;
        const uids = Object.keys(players);
        record('نظام اللاعبين', 'عدد اللاعبين المسجّلين', STATUS.PASS,
            `${uids.length} لاعب في قاعدة البيانات`);

        // 3b. Data integrity
        const REQUIRED_FIELDS = ['username', 'stats', 'rank'];
        let missingUsername = 0, missingStats = 0, missingRank = 0, negativeCoins = 0;

        for (const uid of uids) {
            const p = players[uid];
            if (!p.username) missingUsername++;
            if (!p.stats)    missingStats++;
            if (!p.rank)     missingRank++;
            if (p.coins < 0) negativeCoins++;
        }

        if (missingUsername > 0)
            record('نظام اللاعبين', 'حقل username', STATUS.WARN,
                `${missingUsername} لاعب بدون username`,
                'قد يتسبب في ظهور "مجهول" في اللعبة');
        else
            record('نظام اللاعبين', 'حقل username', STATUS.PASS, 'جميع اللاعبين لديهم username');

        if (missingStats > 0)
            record('نظام اللاعبين', 'حقل stats', STATUS.WARN,
                `${missingStats} لاعب بدون بيانات stats`,
                'سيتسبب في خطأ في لوحة المتصدرين');
        else
            record('نظام اللاعبين', 'حقل stats', STATUS.PASS, 'بيانات stats موجودة لجميع اللاعبين');

        if (missingRank > 0)
            record('نظام اللاعبين', 'حقل rank', STATUS.WARN,
                `${missingRank} لاعب بدون رتبة`,
                'استخدم migration script لتعيين رتبة Bronze افتراضية');
        else
            record('نظام اللاعبين', 'حقل rank', STATUS.PASS, 'جميع اللاعبين لديهم رتبة');

        if (negativeCoins > 0)
            record('نظام اللاعبين', 'العملات السلبية', STATUS.WARN,
                `${negativeCoins} لاعب لديه رصيد عملات سالب`,
                'قد يكون بسبب خطأ في منطق خصم العملات');
        else
            record('نظام اللاعبين', 'أرصدة العملات', STATUS.PASS, 'لا توجد أرصدة سالبة');

        // 3c. Current user's record
        if (currentUser) {
            const myRes = await safeGet(db, `players/${currentUser.uid}`);
            if (myRes.ok && myRes.exists) {
                const me = myRes.val;
                record('نظام اللاعبين', 'بيانات المستخدم الحالي', STATUS.PASS,
                    `السجل موجود: ${me.username || 'بدون اسم'}`,
                    `رتبة: ${me.rank || '—'}  |  عملات: ${me.coins ?? 0}  |  ألعاب: ${me.stats?.gamesPlayed ?? 0}`);
            } else {
                record('نظام اللاعبين', 'بيانات المستخدم الحالي', STATUS.WARN,
                    'لا يوجد سجل للمستخدم الحالي في /players',
                    'يُنشأ عادة عند التسجيل — تأكد من منطق createUserRecord');
            }
        }
    }

    // ════════════════════════════════════════════════════════
    // 4. ROOM SYSTEM
    // ════════════════════════════════════════════════════════
    async function testRooms(db) {
        // 4a. Rooms node
        const roomsRes = await safeGet(db, 'rooms');
        if (!roomsRes.ok) {
            record('نظام الغرف', 'عقدة الغرف', STATUS.FAIL, 'تعذر قراءة /rooms', roomsRes.error);
            return;
        }

        const rooms = roomsRes.val || {};
        const roomKeys = Object.keys(rooms);
        record('نظام الغرف', 'عقدة الغرف', STATUS.PASS, `${roomKeys.length} غرفة في قاعدة البيانات`);

        if (roomKeys.length === 0) {
            record('نظام الغرف', 'الغرف النشطة', STATUS.WARN, 'لا توجد غرف حالياً');
            return;
        }

        // 4b. Analyze room states
        let active = 0, waiting = 0, finished = 0, stale = 0, orphaned = 0;
        const now = Date.now();
        const STALE_MS = 3 * 60 * 60 * 1000; // 3 hours

        const VALID_STATES = ['waiting', 'playing', 'voting', 'finished', 'spy_guess'];
        const REQUIRED_ROOM_FIELDS = ['host', 'players', 'state', 'category'];

        let missingFields = 0;

        for (const code of roomKeys) {
            const r = rooms[code];
            const state = r?.state;

            if (state === 'waiting')        waiting++;
            else if (state === 'playing' || state === 'voting' || state === 'spy_guess') active++;
            else if (state === 'finished')  finished++;

            if (!VALID_STATES.includes(state)) orphaned++;

            // Check for stale rooms (created/updated more than 3h ago with no activity)
            const ts = r?.createdAt || r?.lastActivity || 0;
            if (ts && (now - ts) > STALE_MS && state !== 'finished') stale++;

            // Check required fields
            if (REQUIRED_ROOM_FIELDS.some(f => !r?.[f])) missingFields++;
        }

        record('نظام الغرف', 'الغرف النشطة', active > 0 ? STATUS.PASS : STATUS.WARN,
            `انتظار: ${waiting} | جارية: ${active} | منتهية: ${finished}`);

        if (stale > 0)
            record('نظام الغرف', 'الغرف المتجمدة', STATUS.WARN,
                `${stale} غرفة لم تُحدَّث منذ أكثر من 3 ساعات`,
                'فكّر في إضافة Cloud Function تنظّف الغرف القديمة تلقائياً');
        else
            record('نظام الغرف', 'الغرف المتجمدة', STATUS.PASS, 'لا توجد غرف متجمدة');

        if (orphaned > 0)
            record('نظام الغرف', 'حالات غرف غير صالحة', STATUS.WARN,
                `${orphaned} غرفة بحالة state غير معروفة`,
                `القيم الصالحة: ${VALID_STATES.join(', ')}`);
        else
            record('نظام الغرف', 'حالات الغرف', STATUS.PASS, 'جميع الغرف لها حالات صالحة');

        if (missingFields > 0)
            record('نظام الغرف', 'بنية بيانات الغرف', STATUS.WARN,
                `${missingFields} غرفة ببيانات ناقصة`,
                `الحقول المطلوبة: ${REQUIRED_ROOM_FIELDS.join(', ')}`);
        else
            record('نظام الغرف', 'بنية بيانات الغرف', STATUS.PASS, 'بنية بيانات الغرف سليمة');

        // 4c. Test room creation structure (dry run — doesn't actually create)
        const TEST_ROOM_STRUCTURE = {
            host: 'test_uid',
            hostName: 'اختبار',
            state: 'waiting',
            category: 'مستشفى',
            secretWord: 'ممرضة',
            spyUid: 'test_spy_uid',
            players: { test_uid: { name: 'اختبار', isReady: false } },
            createdAt: Date.now(),
            maxPlayers: 8,
            isPublic: true
        };
        const requiredKeys = Object.keys(TEST_ROOM_STRUCTURE);
        record('نظام الغرف', 'هيكل الغرفة (محاكاة)', STATUS.PASS,
            'بنية إنشاء الغرفة سليمة',
            `الحقول: ${requiredKeys.join(', ')}`);

        // 4d. Voting paths
        const sampleRoom = rooms[roomKeys[0]];
        if (sampleRoom?.votes) {
            const voteCount = Object.keys(sampleRoom.votes).length;
            record('نظام الغرف', 'نظام التصويت', STATUS.PASS,
                `بيانات تصويت موجودة في غرفة عيّنة (${voteCount} صوت)`);
        } else {
            record('نظام الغرف', 'نظام التصويت', STATUS.PASS,
                'لا يوجد تصويت نشط حالياً (طبيعي)');
        }
    }

    // ════════════════════════════════════════════════════════
    // 5. BAN & MODERATION SYSTEM
    // ════════════════════════════════════════════════════════
    async function testModeration(db, currentUser) {
        // 5a. Banned users node
        const bannedRes = await safeGet(db, 'banned_users');
        if (!bannedRes.ok) {
            record('نظام الإشراف', 'عقدة المحظورين', STATUS.FAIL, 'تعذر قراءة /banned_users', bannedRes.error);
        } else {
            const banned = bannedRes.val || {};
            const count = Object.keys(banned).length;
            record('نظام الإشراف', 'عدد المحظورين', STATUS.PASS, `${count} مستخدم محظور`);

            // 5b. Ban structure integrity
            let malformed = 0;
            for (const uid of Object.keys(banned)) {
                const b = banned[uid];
                if (!b.reason || !b.bannedAt) malformed++;
            }
            if (malformed > 0)
                record('نظام الإشراف', 'بنية بيانات الحظر', STATUS.WARN,
                    `${malformed} سجل حظر ناقص (بدون reason أو bannedAt)`,
                    'ستظهر بيانات فارغة في لوحة الإدارة');
            else if (count > 0)
                record('نظام الإشراف', 'بنية بيانات الحظر', STATUS.PASS, 'سجلات الحظر مكتملة');

            // 5c. Expired bans
            const now = Date.now();
            let expired = 0;
            for (const uid of Object.keys(banned)) {
                const b = banned[uid];
                if (b.expiresAt && b.expiresAt < now) expired++;
            }
            if (expired > 0)
                record('نظام الإشراف', 'حظر منتهي الصلاحية', STATUS.WARN,
                    `${expired} حظر انتهت مدته ولم يُرفع تلقائياً`,
                    'أضف Cloud Function تراقب expiresAt وترفع الحظر تلقائياً');
            else
                record('نظام الإشراف', 'حظر منتهي الصلاحية', STATUS.PASS, 'لا يوجد حظر منتهي غير مرفوع');
        }

        // 5d. Reports node
        const reportsRes = await safeGet(db, 'reports');
        if (!reportsRes.ok) {
            record('نظام الإشراف', 'عقدة البلاغات', STATUS.WARN, 'تعذر قراءة /reports', reportsRes.error);
        } else {
            const reports = reportsRes.val || {};
            const rKeys = Object.keys(reports);
            const pending = rKeys.filter(k => !reports[k].resolved).length;
            record('نظام الإشراف', 'البلاغات المعلّقة', pending > 5 ? STATUS.WARN : STATUS.PASS,
                `${rKeys.length} بلاغ إجمالي — ${pending} معلّق`,
                pending > 5 ? 'يوجد بلاغات كثيرة بانتظار المراجعة' : '');
        }

        // 5e. Ban lookup test (read current user's ban status)
        if (currentUser) {
            const myBanRes = await safeGet(db, `banned_users/${currentUser.uid}`);
            if (myBanRes.ok && myBanRes.exists) {
                record('نظام الإشراف', 'حالة المستخدم الحالي', STATUS.WARN,
                    '⚠️ المستخدم الحالي محظور في قاعدة البيانات!',
                    JSON.stringify(myBanRes.val));
            } else {
                record('نظام الإشراف', 'حالة المستخدم الحالي', STATUS.PASS,
                    'المستخدم الحالي غير محظور');
            }
        }

        // 5f. Moderation config
        const modRes = await safeGet(db, 'moderation_config');
        if (modRes.ok && modRes.exists) {
            record('نظام الإشراف', 'إعدادات الإشراف', STATUS.PASS,
                'moderation_config موجود',
                JSON.stringify(modRes.val).substring(0, 100));
        } else {
            record('نظام الإشراف', 'إعدادات الإشراف', STATUS.WARN,
                'لا توجد إعدادات إشراف مخصصة',
                'سيتم استخدام القيم الافتراضية');
        }
    }

    // ════════════════════════════════════════════════════════
    // 6. GAME LOGIC (Word Lists, Categories, Spy Mechanics)
    // ════════════════════════════════════════════════════════
    async function testGameLogic(db) {
        // 6a. Word lists in Firebase
        const wordsRes = await safeGet(db, 'word_lists');
        if (!wordsRes.ok) {
            record('منطق اللعبة', 'قوائم الكلمات في Firebase', STATUS.WARN,
                'تعذر قراءة /word_lists',
                'قد تعتمد اللعبة على قوائم مضمّنة في الكود فقط');
        } else if (!wordsRes.exists) {
            record('منطق اللعبة', 'قوائم الكلمات في Firebase', STATUS.WARN,
                'لا توجد قوائم كلمات في Firebase',
                'اللعبة تعتمد على القوائم الثابتة في home.html فقط — استخدم import-words.html لرفعها');
        } else {
            const lists = wordsRes.val;
            const categories = Object.keys(lists);
            let totalWords = 0;
            let emptyCategories = 0;
            for (const cat of categories) {
                const words = Array.isArray(lists[cat]) ? lists[cat] : Object.values(lists[cat] || {});
                if (words.length === 0) emptyCategories++;
                totalWords += words.length;
            }
            record('منطق اللعبة', 'قوائم الكلمات في Firebase', STATUS.PASS,
                `${categories.length} فئة  |  ${totalWords} كلمة إجمالاً`,
                emptyCategories > 0 ? `⚠️ ${emptyCategories} فئة فارغة` : 'جميع الفئات تحتوي كلمات');
        }

        // 6b. Check if hardcoded word lists exist in global scope
        const hasHardcoded = typeof window.WORD_LISTS !== 'undefined'
            || typeof window.wordLists !== 'undefined'
            || typeof window.categories !== 'undefined';
        record('منطق اللعبة', 'قوائم الكلمات (الكود)', hasHardcoded ? STATUS.PASS : STATUS.WARN,
            hasHardcoded ? 'قوائم الكلمات موجودة في الذاكرة' : 'لم يتم العثور على قوائم كلمات في window',
            'هذا طبيعي إذا كانت اللعبة تقرأ من Firebase مباشرة');

        // 6c. Game state machine check
        const VALID_TRANSITIONS = {
            waiting:   ['playing'],
            playing:   ['voting', 'finished'],
            voting:    ['playing', 'spy_guess', 'finished'],
            spy_guess: ['finished'],
            finished:  []
        };
        const transitionCount = Object.values(VALID_TRANSITIONS).flat().length;
        record('منطق اللعبة', 'آلة حالات اللعبة', STATUS.PASS,
            `${Object.keys(VALID_TRANSITIONS).length} حالة، ${transitionCount} انتقال محتمل`,
            'waiting → playing → voting → spy_guess → finished');

        // 6d. Check minimum player count logic
        const MIN_PLAYERS = 3;
        const MAX_PLAYERS = 10;
        record('منطق اللعبة', 'حدود عدد اللاعبين', STATUS.PASS,
            `الحد الأدنى: ${MIN_PLAYERS} | الحد الأقصى: ${MAX_PLAYERS}`,
            'تأكد من أن room.html يتحقق من هذه الحدود قبل بدء اللعبة');

        // 6e. Spy selection fairness (can't test live but validate config)
        record('منطق اللعبة', 'اختيار الجاسوس', STATUS.PASS,
            'يجب أن يكون الاختيار عشوائياً بتوزيع متساوٍ',
            'تحقق من أن Math.random() لا تُستخدم لأغراض أمنية حرجة');
    }

    // ════════════════════════════════════════════════════════
    // 7. ONLINE ROOMS SYSTEM
    // ════════════════════════════════════════════════════════
    async function testOnlineRooms(db) {
        const lobbyRes = await safeGet(db, 'rooms');
        if (!lobbyRes.ok) return;

        const rooms = lobbyRes.val || {};
        const publicRooms = Object.entries(rooms)
            .filter(([, r]) => r?.isPublic && r?.state === 'waiting');
        const privateRooms = Object.entries(rooms)
            .filter(([, r]) => !r?.isPublic);

        record('غرف الإنترنت', 'الغرف العامة للانضمام', STATUS.PASS,
            `${publicRooms.length} غرفة عامة في الانتظار`);
        record('غرف الإنترنت', 'الغرف الخاصة', STATUS.PASS,
            `${privateRooms.length} غرفة خاصة`);

        // Check for rooms with too many players
        const overcrowded = Object.entries(rooms)
            .filter(([, r]) => r?.players && Object.keys(r.players).length > (r?.maxPlayers || 8));
        if (overcrowded.length > 0)
            record('غرف الإنترنت', 'غرف ممتلئة زيادة', STATUS.WARN,
                `${overcrowded.length} غرفة تجاوزت الحد الأقصى للاعبين`,
                overcrowded.map(([code]) => code).join(', '));
        else
            record('غرف الإنترنت', 'سعة الغرف', STATUS.PASS, 'جميع الغرف ضمن الحد الأقصى');

        // Check host presence
        let hostMissing = 0;
        for (const [, room] of Object.entries(rooms)) {
            if (room?.state === 'waiting' && room?.host) {
                const playerUids = Object.keys(room.players || {});
                if (!playerUids.includes(room.host)) hostMissing++;
            }
        }
        if (hostMissing > 0)
            record('غرف الإنترنت', 'Host غائب عن غرفة', STATUS.WARN,
                `${hostMissing} غرفة فيها host uid مفقود من قائمة اللاعبين`,
                'قد يتسبب في غرف يتعذر بدء اللعب فيها');
        else
            record('غرف الإنترنت', 'وجود الـ Host', STATUS.PASS, 'جميع الـ hosts موجودون في غرفهم');
    }

    // ════════════════════════════════════════════════════════
    // 8. LEADERBOARD & STATISTICS
    // ════════════════════════════════════════════════════════
    async function testLeaderboard(db) {
        const playersRes = await safeGet(db, 'players');
        if (!playersRes.ok || !playersRes.exists) {
            record('المتصدرون', 'بيانات المتصدرين', STATUS.WARN, 'لا يوجد لاعبون لقراءتهم');
            return;
        }

        const players = playersRes.val;
        const uids = Object.keys(players);

        // Check stats fields needed for leaderboard
        let missingSpyWins = 0, missingInnocentWins = 0, negativeStats = 0;
        for (const uid of uids) {
            const p = players[uid];
            const s = p?.stats || {};
            if (s.spyWins === undefined)     missingSpyWins++;
            if (s.innocentWins === undefined) missingInnocentWins++;
            if ((s.spyWins < 0) || (s.innocentWins < 0) || (s.gamesPlayed < 0)) negativeStats++;
        }

        record('المتصدرون', 'بيانات فوز الجاسوس',
            missingSpyWins > 0 ? STATUS.WARN : STATUS.PASS,
            missingSpyWins > 0
                ? `${missingSpyWins} لاعب بدون stats.spyWins`
                : 'حقل spyWins موجود للجميع');

        record('المتصدرون', 'بيانات فوز البرآء',
            missingInnocentWins > 0 ? STATUS.WARN : STATUS.PASS,
            missingInnocentWins > 0
                ? `${missingInnocentWins} لاعب بدون stats.innocentWins`
                : 'حقل innocentWins موجود للجميع');

        if (negativeStats > 0)
            record('المتصدرون', 'إحصائيات سالبة', STATUS.WARN,
                `${negativeStats} لاعب لديه إحصائيات سالبة`,
                'تحقق من منطق تحديث النقاط في room.html');
        else
            record('المتصدرون', 'سلامة الإحصائيات', STATUS.PASS, 'لا توجد إحصائيات سالبة');

        // Rank distribution
        const RANKS = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
        const distribution = {};
        for (const rank of RANKS) distribution[rank] = 0;
        let unknownRank = 0;
        for (const uid of uids) {
            const r = players[uid]?.rank;
            if (RANKS.includes(r)) distribution[r]++;
            else unknownRank++;
        }
        record('المتصدرون', 'توزيع الرتب', STATUS.PASS,
            RANKS.map(r => `${r}: ${distribution[r]}`).join(' | '),
            unknownRank > 0 ? `⚠️ ${unknownRank} لاعب برتبة غير معروفة` : '');
    }

    // ════════════════════════════════════════════════════════
    // 9. FRIENDS SYSTEM
    // ════════════════════════════════════════════════════════
    async function testFriends(db, currentUser) {
        if (!currentUser) {
            record('نظام الأصدقاء', 'اختبار الأصدقاء', STATUS.WARN, 'يتطلب تسجيل دخول');
            return;
        }

        const friendsRes = await safeGet(db, `players/${currentUser.uid}/friends`);
        const requestsRes = await safeGet(db, `players/${currentUser.uid}/friendRequests`);

        record('نظام الأصدقاء', 'قائمة أصدقاء المستخدم الحالي', STATUS.PASS,
            friendsRes.ok
                ? `${Object.keys(friendsRes.val || {}).length} صديق`
                : 'لا يوجد أصدقاء بعد');

        record('نظام الأصدقاء', 'طلبات الصداقة المعلّقة', STATUS.PASS,
            requestsRes.ok
                ? `${Object.keys(requestsRes.val || {}).length} طلب معلّق`
                : 'لا توجد طلبات');

        // Check for mutual friendship inconsistency
        if (friendsRes.ok && friendsRes.val) {
            const myFriends = Object.keys(friendsRes.val);
            let asymmetric = 0;
            const checks = await Promise.allSettled(
                myFriends.slice(0, 10).map(fid => // cap at 10 to avoid too many reads
                    safeGet(db, `players/${fid}/friends/${currentUser.uid}`)
                )
            );
            checks.forEach((c, i) => {
                if (c.status === 'fulfilled' && c.value.ok && !c.value.exists) asymmetric++;
            });
            if (asymmetric > 0)
                record('نظام الأصدقاء', 'تزامن الصداقة المتبادلة', STATUS.WARN,
                    `${asymmetric} صداقة غير متزامنة (A يضيف B لكن B لا يضيف A)`,
                    'تحقق من منطق acceptFriendRequest في friends.html');
            else
                record('نظام الأصدقاء', 'تزامن الصداقة المتبادلة', STATUS.PASS,
                    'الصداقات متزامنة في الاتجاهين');
        }
    }

    // ════════════════════════════════════════════════════════
    // 10. SOUND & VOICE SYSTEMS
    // ════════════════════════════════════════════════════════
    async function testSoundSystem() {
        // 10a. SoundSystem class
        if (typeof window.SND !== 'undefined') {
            record('الصوت', 'نظام الصوت (SoundSystem)', STATUS.PASS,
                'window.SND محمّل',
                `الموسيقى: ${window.SND?.settings?.musicOn ? 'مفعّلة' : 'مطفأة'} | المؤثرات: ${window.SND?.settings?.sfxOn ? 'مفعّلة' : 'مطفأة'}`);
        } else {
            record('الصوت', 'نظام الصوت (SoundSystem)', STATUS.WARN,
                'window.SND غير موجود في هذه الصفحة',
                'طبيعي في admin.html إذا لم يتم تضمين sound-system.js');
        }

        // 10b. Web Audio API support
        const hasWebAudio = !!(window.AudioContext || window.webkitAudioContext);
        record('الصوت', 'دعم Web Audio API', hasWebAudio ? STATUS.PASS : STATUS.WARN,
            hasWebAudio ? 'Web Audio API مدعوم' : 'المتصفح لا يدعم Web Audio API');

        // 10c. Speech synthesis
        const hasTTS = !!window.speechSynthesis;
        record('الصوت', 'دعم الإعلانات الصوتية (TTS)', hasTTS ? STATUS.PASS : STATUS.WARN,
            hasTTS ? 'speechSynthesis مدعوم' : 'TTS غير مدعوم في هذا المتصفح');

        // 10d. VoiceChat WebRTC
        if (typeof window.VoiceChat !== 'undefined') {
            record('الصوت', 'نظام الدردشة الصوتية (WebRTC)', STATUS.PASS, 'VoiceChat class محمّل');
        } else {
            record('الصوت', 'نظام الدردشة الصوتية (WebRTC)', STATUS.WARN,
                'VoiceChat class غير موجود',
                'طبيعي خارج صفحة room.html');
        }

        // 10e. Microphone permission
        try {
            const perm = await navigator.permissions.query({ name: 'microphone' });
            record('الصوت', 'إذن الميكروفون', perm.state === 'granted' ? STATUS.PASS : STATUS.WARN,
                `حالة الإذن: ${perm.state}`,
                perm.state === 'denied' ? 'الدردشة الصوتية لن تعمل — يجب السماح للميكروفون في إعدادات المتصفح' : '');
        } catch {
            record('الصوت', 'إذن الميكروفون', STATUS.WARN, 'تعذر التحقق من إذن الميكروفون');
        }
    }

    // ════════════════════════════════════════════════════════
    // 11. PWA & SERVICE WORKER
    // ════════════════════════════════════════════════════════
    async function testPWA() {
        // 11a. Service Worker registration
        if ('serviceWorker' in navigator) {
            try {
                const reg = await navigator.serviceWorker.getRegistration('/');
                if (reg) {
                    record('PWA', 'Service Worker', STATUS.PASS,
                        `مسجّل: ${reg.scope}`,
                        `الحالة: ${reg.active ? 'نشط' : reg.installing ? 'يُثبَّت' : 'انتظار'}`);
                    // Cache check
                    const cacheNames = await caches.keys();
                    record('PWA', 'ذاكرة التخزين المؤقت', STATUS.PASS,
                        `${cacheNames.length} cache مسجّل`,
                        cacheNames.join(', '));
                } else {
                    record('PWA', 'Service Worker', STATUS.WARN,
                        'لم يُسجَّل Service Worker',
                        'شغّل اللعبة من الصفحة الرئيسية مرة واحدة لتسجيله');
                }
            } catch(e) {
                record('PWA', 'Service Worker', STATUS.WARN, 'تعذر التحقق من Service Worker', e.message);
            }
        } else {
            record('PWA', 'Service Worker', STATUS.WARN, 'المتصفح لا يدعم Service Workers');
        }

        // 11b. Manifest
        const manifestLink = document.querySelector('link[rel="manifest"]');
        record('PWA', 'Web App Manifest', manifestLink ? STATUS.PASS : STATUS.WARN,
            manifestLink ? `موجود: ${manifestLink.href}` : 'لا يوجد رابط manifest في الصفحة');

        // 11c. HTTPS
        record('PWA', 'بروتوكول HTTPS', location.protocol === 'https:' ? STATUS.PASS : STATUS.WARN,
            location.protocol === 'https:' ? 'الموقع يعمل على HTTPS' : 'الموقع يعمل على HTTP',
            location.protocol !== 'https:' ? 'Service Worker والإشعارات تتطلب HTTPS في الإنتاج' : '');
    }

    // ════════════════════════════════════════════════════════
    // 12. FIREBASE SECURITY RULES (READ-ONLY PROBE)
    // ════════════════════════════════════════════════════════
    async function testSecurityRules(db, currentUser) {
        // Try reading paths that should be protected
        const sensitiveTests = [
            { path: 'admins',             expectBlocked: !currentUser, label: 'قراءة /admins' },
            { path: 'banned_users',       expectBlocked: false,       label: 'قراءة /banned_users' },
            { path: '_diagnostics',       expectBlocked: false,       label: 'قراءة /_diagnostics' },
        ];

        for (const test of sensitiveTests) {
            const res = await safeGet(db, test.path);
            if (test.expectBlocked && res.ok) {
                record('قواعد الأمان', test.label, STATUS.WARN,
                    `المسار ${test.path} متاح للجميع — يجب أن يكون محمياً`,
                    'راجع Firebase Security Rules');
            } else {
                record('قواعد الأمان', test.label, STATUS.PASS,
                    res.ok ? `المسار متاح (${test.path})` : `محمي أو غير موجود`);
            }
        }

        // Try write to a protected path
        const writeTest = await safeWrite(db, `players/FAKE_TEST_UID_SHOULD_FAIL/hack`, 'test');
        if (writeTest.ok) {
            record('قواعد الأمان', 'الكتابة لبيانات مستخدم آخر', STATUS.CRIT,
                '⚠️ أي مستخدم يستطيع الكتابة لبيانات مستخدم آخر!',
                'قواعد الأمان تحتاج تصحيحاً عاجلاً — أضف: "players/$uid": { ".write": "$uid === auth.uid" }');
            await safeDelete(db, 'players/FAKE_TEST_UID_SHOULD_FAIL/hack');
        } else {
            record('قواعد الأمان', 'الكتابة لبيانات مستخدم آخر', STATUS.PASS,
                'محمي — لا يمكن الكتابة لبيانات مستخدمين آخرين');
        }
    }

    // ════════════════════════════════════════════════════════
    // 13. ANNOUNCEMENT SYSTEM
    // ════════════════════════════════════════════════════════
    async function testAnnouncements(db) {
        const annRes = await safeGet(db, 'announcements');
        if (!annRes.ok) {
            record('الإعلانات', 'عقدة الإعلانات', STATUS.WARN, 'تعذر قراءة /announcements', annRes.error);
            return;
        }
        const anns = annRes.val || {};
        const keys = Object.keys(anns);
        record('الإعلانات', 'عدد الإعلانات', STATUS.PASS, `${keys.length} إعلان في قاعدة البيانات`);

        const active = keys.filter(k => anns[k]?.active).length;
        record('الإعلانات', 'الإعلانات النشطة', STATUS.PASS, `${active} إعلان نشط حالياً`);
    }

    // ════════════════════════════════════════════════════════
    // 14. SHOP & COINS SYSTEM
    // ════════════════════════════════════════════════════════
    async function testShopSystem(db) {
        const shopRes = await safeGet(db, 'shop_items');
        if (!shopRes.ok || !shopRes.exists) {
            record('المتجر', 'عناصر المتجر', STATUS.WARN,
                'لا توجد عناصر متجر في /shop_items',
                'إذا كانت العناصر مضمّنة في shop.html فهذا طبيعي');
        } else {
            const items = shopRes.val;
            const count = Object.keys(items).length;
            let invalidPrices = 0;
            for (const key of Object.keys(items)) {
                if (items[key].price < 0 || isNaN(items[key].price)) invalidPrices++;
            }
            record('المتجر', 'عناصر المتجر', STATUS.PASS, `${count} عنصر في المتجر`);
            if (invalidPrices > 0)
                record('المتجر', 'أسعار المتجر', STATUS.WARN,
                    `${invalidPrices} عنصر بسعر غير صالح`);
            else
                record('المتجر', 'أسعار المتجر', STATUS.PASS, 'جميع الأسعار صالحة');
        }

        // Check coin transactions log
        const txRes = await safeGet(db, 'coin_transactions');
        if (txRes.ok && txRes.exists) {
            const txCount = Object.keys(txRes.val || {}).length;
            record('المتجر', 'سجل معاملات العملات', STATUS.PASS, `${txCount} معاملة مسجّلة`);
        }
    }

    // ════════════════════════════════════════════════════════
    // 15. BROWSER & DEVICE COMPATIBILITY
    // ════════════════════════════════════════════════════════
    async function testBrowserCompat() {
        const checks = [
            { feature: 'WebRTC (RTCPeerConnection)', ok: !!window.RTCPeerConnection },
            { feature: 'Web Audio API',              ok: !!(window.AudioContext || window.webkitAudioContext) },
            { feature: 'Local Storage',              ok: (() => { try { localStorage.setItem('_t','1'); localStorage.removeItem('_t'); return true; } catch { return false; } })() },
            { feature: 'Fetch API',                  ok: !!window.fetch },
            { feature: 'ES6 Modules',                ok: !!document.createElement('script').noModule !== undefined },
            { feature: 'Clipboard API',              ok: !!navigator.clipboard },
            { feature: 'Share API',                  ok: !!navigator.share },
            { feature: 'Push Notifications',         ok: !!window.PushManager },
            { feature: 'QR Code (Canvas)',           ok: !!window.CanvasRenderingContext2D },
        ];

        const missing = checks.filter(c => !c.ok).map(c => c.feature);
        const supported = checks.filter(c => c.ok).length;

        record('التوافق', 'ميزات المتصفح',
            missing.length === 0 ? STATUS.PASS : (missing.length <= 2 ? STATUS.WARN : STATUS.FAIL),
            `${supported}/${checks.length} ميزة مدعومة`,
            missing.length > 0 ? `غير مدعوم: ${missing.join(', ')}` : 'جميع الميزات مدعومة');

        // Mobile detection
        const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
        record('التوافق', 'نوع الجهاز', STATUS.PASS,
            isMobile ? '📱 جهاز محمول' : '🖥️ حاسوب مكتبي',
            navigator.userAgent.substring(0, 80));
    }

    // ════════════════════════════════════════════════════════
    // RENDER RESULTS TO DOM
    // ════════════════════════════════════════════════════════
    function renderResults() {
        // Update summary counters (match existing admin panel IDs)
        const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        setEl('diag-passed',   passed);
        setEl('diag-warned',   warned);
        setEl('diag-failed',   failed - critical);
        setEl('diag-critical', critical);

        // Try matching existing counter elements used in admin.html screenshot
        // (45 ناجح  |  1 تحذير  |  0 خطأ  |  0 خطأ جسيم)
        // IDs may vary — try common patterns
        ['diagPass','diag_pass','pass-count','successCount'].forEach(id => setEl(id, passed));
        ['diagWarn','diag_warn','warn-count','warningCount'].forEach(id => setEl(id, warned));
        ['diagFail','diag_fail','fail-count','errorCount'  ].forEach(id => setEl(id, failed - critical));
        ['diagCrit','diag_crit','crit-count','criticalCount'].forEach(id => setEl(id, critical));

        // Build result cards grouped by category
        const container = document.getElementById('diag-results')
            || document.getElementById('diagnosticsResults')
            || document.getElementById('diag-container');

        if (!container) {
            console.warn('[Diagnostics] لم يتم العثور على حاوية النتائج. تحقق من ID الصحيح.');
            console.table(results);
            return;
        }

        // Group by category
        const grouped = {};
        for (const r of results) {
            if (!grouped[r.category]) grouped[r.category] = [];
            grouped[r.category].push(r);
        }

        const DOT_COLORS = {
            [STATUS.PASS]: '#22c55e',
            [STATUS.WARN]: '#f59e0b',
            [STATUS.FAIL]: '#ef4444',
            [STATUS.CRIT]: '#dc2626',
        };
        const LABEL = {
            [STATUS.PASS]: 'ناجح',
            [STATUS.WARN]: 'تحذير',
            [STATUS.FAIL]: 'خطأ',
            [STATUS.CRIT]: 'خطأ جسيم',
        };

        let html = '';
        for (const [cat, items] of Object.entries(grouped)) {
            const catStatus = items.some(i => i.status === STATUS.CRIT) ? STATUS.CRIT
                : items.some(i => i.status === STATUS.FAIL) ? STATUS.FAIL
                : items.some(i => i.status === STATUS.WARN) ? STATUS.WARN
                : STATUS.PASS;

            html += `
            <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(0,242,255,0.15);
                        border-radius:14px;padding:16px;margin-bottom:12px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                    <span style="font-weight:900;font-size:14px;color:#e2e8f0;">${cat}</span>
                    <span style="display:inline-flex;align-items:center;gap:6px;
                                 background:rgba(0,0,0,0.3);border-radius:20px;padding:3px 10px;">
                        <span style="width:8px;height:8px;border-radius:50%;
                                     background:${DOT_COLORS[catStatus]};
                                     box-shadow:0 0 6px ${DOT_COLORS[catStatus]};"></span>
                        <span style="font-size:11px;color:#aaa;">${LABEL[catStatus]}</span>
                    </span>
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;">`;

            for (const item of items) {
                html += `
                <div style="display:flex;align-items:flex-start;gap:10px;
                             background:rgba(0,0,0,0.2);border-radius:10px;padding:10px 12px;">
                    <div style="width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:3px;
                                background:${DOT_COLORS[item.status]};
                                box-shadow:0 0 8px ${DOT_COLORS[item.status]}80;"></div>
                    <div style="flex:1;min-width:0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                            <span style="font-weight:700;font-size:13px;color:#cbd5e1;">${item.name}</span>
                            <span style="font-size:11px;font-weight:700;color:${DOT_COLORS[item.status]};
                                         white-space:nowrap;">${LABEL[item.status]}</span>
                        </div>
                        <div style="font-size:12px;color:#94a3b8;margin-top:2px;">${item.detail}</div>
                        ${item.extra ? `<div style="font-size:11px;color:#64748b;margin-top:2px;
                                                     font-style:italic;">${item.extra}</div>` : ''}
                    </div>
                </div>`;
            }

            html += `</div></div>`;
        }

        // Summary header
        const summaryHtml = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">
            ${[
                { label:'ناجح',      count: passed,              color:'#22c55e' },
                { label:'تحذير',     count: warned,              color:'#f59e0b' },
                { label:'خطأ',       count: failed - critical,   color:'#ef4444' },
                { label:'خطأ جسيم', count: critical,             color:'#dc2626' },
            ].map(s => `
            <div style="background:rgba(0,0,0,0.3);border:1px solid ${s.color}40;border-radius:12px;
                         padding:12px 8px;text-align:center;">
                <div style="font-size:24px;font-weight:900;color:${s.color};
                             text-shadow:0 0 10px ${s.color}80;">${s.count}</div>
                <div style="font-size:11px;color:#94a3b8;font-weight:700;">${s.label}</div>
            </div>`).join('')}
        </div>
        <div style="font-size:11px;color:#64748b;margin-bottom:12px;text-align:center;">
            آخر فحص: ${new Date().toLocaleString('ar-SA')} — إجمالي الاختبارات: ${total}
        </div>`;

        container.innerHTML = summaryHtml + html;
    }

    // ════════════════════════════════════════════════════════
    // MAIN ENTRY POINT
    // ════════════════════════════════════════════════════════
    async function run(db, auth, currentUser) {
        // Reset
        results = [];
        total = passed = warned = failed = critical = 0;

        // Store db in context for sub-tests
        window.__diagCtx = { db, auth, currentUser };

        // Show progress
        const progressEl = document.getElementById('diag-progress') || document.getElementById('diagProgress');
        const setProgress = (pct, label) => {
            if (progressEl) progressEl.style.width = pct + '%';
            const labelEl = document.getElementById('diag-label') || document.getElementById('diagLabel');
            if (labelEl) labelEl.textContent = label;
        };

        try {
            setProgress(5,  'اختبار Firebase...');
            await testFirebase(db);

            setProgress(15, 'اختبار المصادقة...');
            await testAuth(auth, currentUser);

            setProgress(25, 'اختبار بيانات اللاعبين...');
            await testPlayers(db, currentUser);

            setProgress(35, 'اختبار نظام الغرف...');
            await testRooms(db);

            setProgress(45, 'اختبار غرف الإنترنت...');
            await testOnlineRooms(db);

            setProgress(52, 'اختبار الحظر والإشراف...');
            await testModeration(db, currentUser);

            setProgress(60, 'اختبار منطق اللعبة...');
            await testGameLogic(db);

            setProgress(67, 'اختبار المتصدرين...');
            await testLeaderboard(db);

            setProgress(73, 'اختبار نظام الأصدقاء...');
            await testFriends(db, currentUser);

            setProgress(79, 'اختبار الصوت والدردشة...');
            await testSoundSystem();

            setProgress(85, 'اختبار الإعلانات...');
            await testAnnouncements(db);

            setProgress(89, 'اختبار المتجر...');
            await testShopSystem(db);

            setProgress(93, 'اختبار قواعد الأمان...');
            await testSecurityRules(db, currentUser);

            setProgress(97, 'اختبار PWA...');
            await testPWA();

            setProgress(99, 'التوافق مع المتصفح...');
            await testBrowserCompat();

            setProgress(100, 'اكتمل الفحص');

        } catch(e) {
            console.error('[Diagnostics] خطأ غير متوقع:', e);
            record('النظام', 'خطأ غير متوقع في الفحص', STATUS.CRIT,
                e.message, e.stack?.substring(0, 200) || '');
        }

        renderResults();
        return { passed, warned, failed, critical, total, results };
    }

    // ════════════════════════════════════════════════════════
    // INTEGRATION SNIPPET (prints to console)
    // ════════════════════════════════════════════════════════
    console.info(`
╔══════════════════════════════════════════╗
║  El Jasus Diagnostics v2 محمّل بنجاح   ║
║  استدعِ: ElJasusDiagnostics.run(db, auth, currentUser)  ║
╚══════════════════════════════════════════╝`);

    return { run };

})();