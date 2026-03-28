// ═══════════════════════════════════════════════
// EL JASUS ADMIN PANEL - DIAGNOSTICS ENGINE
// ═══════════════════════════════════════════════

let diagLog = '';
let diagCounts = { major: 0, error: 0, warning: 0, pass: 0 };
let diagRunning = false;

// Helper to emit a test result into a container
function diagResult(containerId, severity, name, detail) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const icons = { major:'🔴', error:'🟠', warning:'🟡', pass:'🟢', info:'🔵', running:'⏳' };
    const classes = { major:'test-major', error:'test-error', warning:'test-warning', pass:'test-pass', info:'test-info', running:'test-running' };
    const item = document.createElement('div');
    item.className = `test-item ${classes[severity] || 'test-info'}`;
    item.innerHTML = `
        <span class="test-icon">${icons[severity] || 'ℹ️'}</span>
        <div>
            <div class="test-name">${name}</div>
            ${detail ? `<div class="test-detail">${detail}</div>` : ''}
        </div>`;
    container.appendChild(item);

    // Count
    if (['major','error','warning','pass'].includes(severity)) diagCounts[severity]++;

    // Log
    const ts = new Date().toISOString().slice(11,19);
    const sev = severity.toUpperCase().padEnd(7);
    diagLog += `[${ts}] ${sev} | ${name}${detail ? ' — ' + detail.replace(/<[^>]+>/g,'') : ''}\n`;
    const logEl = document.getElementById('diag-log');
    if (logEl) {
        logEl.textContent = diagLog;
        logEl.scrollTop = logEl.scrollHeight;
    }
}

function diagSetDot(id, color) {
    const el = document.getElementById(id);
    if (el) el.style.background = color;
}

function diagUpdateCounters() {
    document.getElementById('cnt-major').textContent   = diagCounts.major;
    document.getElementById('cnt-error').textContent   = diagCounts.error;
    document.getElementById('cnt-warning').textContent = diagCounts.warning;
    document.getElementById('cnt-pass').textContent    = diagCounts.pass;
    const summary = document.getElementById('diag-summary');
    summary.style.setProperty('display', 'flex', 'important');

    // Badge in sidebar
    const hasIssues = diagCounts.major + diagCounts.error + diagCounts.warning > 0;
    const badge = document.getElementById('diag-badge');
    if (badge) badge.style.display = hasIssues ? 'inline-block' : 'none';
}

function diagProgress(current, total, label) {
    const pct = Math.round(current / total * 100);
    const bar = document.getElementById('diag-progress-bar');
    const pctEl = document.getElementById('diag-progress-pct');
    const labelEl = document.getElementById('diag-progress-label');
    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (label && labelEl) labelEl.textContent = label;
}

window.clearDiagnostics = function() {
    ['tests-connection','tests-data','tests-stats','tests-integrity','tests-functions','tests-content']
        .forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = ''; });
    ['dot-connection','dot-data','dot-functions','dot-stats','dot-integrity','dot-content']
        .forEach(id => diagSetDot(id, '#555'));
    const logEl = document.getElementById('diag-log');
    if (logEl) logEl.textContent = 'جاهز للتشخيص — اضغط "تشغيل الفحص" للبدء';
    const summary = document.getElementById('diag-summary');
    if (summary) summary.style.setProperty('display', 'none', 'important');
    const progress = document.getElementById('diag-progress-wrap');
    if (progress) progress.style.display = 'none';
    diagLog = ''; 
    diagCounts = { major:0, error:0, warning:0, pass:0 };
};

window.copyDiagLog = function() {
    navigator.clipboard.writeText(diagLog).then(() =>
        UIAlert('تم نسخ سجل التشخيص', { title: 'تم النسخ', type: 'success', icon: '📋' })
    );
};

window.runDiagnostics = async function() {
    if (diagRunning) return;
    diagRunning = true;
    clearDiagnostics();
    
    const btn = document.getElementById('run-tests-btn');
    if (btn) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin ml-2"></i>جاري الفحص...';
        btn.disabled = true;
    }

    const progress = document.getElementById('diag-progress-wrap');
    if (progress) progress.style.display = 'block';
    
    const lastRun = document.getElementById('diag-last-run');
    if (lastRun) lastRun.textContent = 'آخر فحص: ' + new Date().toLocaleString('ar-SA');
    
    diagLog = `=== EL JASUS DIAGNOSTICS RUN ===\n${new Date().toISOString()}\n\n`;

    const TOTAL = 30;
    let step = 0;
    const step_ = (lbl) => { step++; diagProgress(step, TOTAL, lbl); };
    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    // Get Firebase refs from window
    const { db, auth, ref, get } = window;
    
    if (!db || !auth || !ref || !get) {
        diagResult('tests-connection', 'major', 'Firebase غير متاح', 'لم يتم تحميل Firebase بشكل صحيح');
        diagRunning = false;
        if (btn) {
            btn.innerHTML = '<i class="fas fa-play ml-2"></i>تشغيل الفحص';
            btn.disabled = false;
        }
        return;
    }

    // ─── GROUP 1: CONNECTION & AUTH ─────────────────────
    diagSetDot('dot-connection', '#fbbf24');
    step_('فحص الاتصال بـ Firebase...');
    await delay(100);

    // Test 1: Firebase app init
    try {
        const testSnap = await get(ref(db, 'adminConfig'));
        if (testSnap.exists()) {
            diagResult('tests-connection', 'pass', 'اتصال Firebase', 'القراءة من قاعدة البيانات تعمل بشكل صحيح ✅');
        } else {
            diagResult('tests-connection', 'warning', 'اتصال Firebase — adminConfig فارغ', 'متصل، لكن لا توجد بيانات في adminConfig بعد');
        }
    } catch(e) {
        if (e.message && e.message.includes('Permission')) {
            diagResult('tests-connection', 'warning', 'اتصال Firebase (مقيّد)', 'الاتصال يعمل لكن adminConfig مرفوض — تحقق من قواعد Firebase');
        } else {
            diagResult('tests-connection', 'major', 'فشل الاتصال بـ Firebase', e.message);
        }
    }

    step_('التحقق من حالة المصادقة...');
    await delay(80);

    // Test 2: Auth
    const user = auth.currentUser;
    if (user) {
        diagResult('tests-connection', 'pass', 'المصادقة', `مسجّل الدخول: ${user.email || user.uid}`);
    } else {
        diagResult('tests-connection', 'major', 'غير مسجل الدخول', 'لم يتم التعرف على أي مستخدم — التوجيه لـ login.html');
    }

    step_('التحقق من صلاحيات الإدارة...');
    await delay(80);

    // Test 3: Admin status
    if (user) {
        try {
            const adminSnap = await get(ref(db, `players/${user.uid}/isAdmin`));
            if (adminSnap.val() === true) {
                diagResult('tests-connection', 'pass', 'صلاحيات الإدارة', 'المستخدم الحالي لديه صلاحيات admin');
            } else {
                diagResult('tests-connection', 'major', 'لا صلاحيات إدارة', `players/${user.uid}/isAdmin ليس true`);
            }
        } catch(e) {
            diagResult('tests-connection', 'error', 'خطأ في قراءة صلاحيات', e.message);
        }
    }

    // Test 4: Admin code
    step_('التحقق من رمز الإدارة...');
    await delay(80);
    try {
        const codeSnap = await get(ref(db, 'adminConfig/accessCode'));
        if (codeSnap.exists()) {
            diagResult('tests-connection', 'pass', 'رمز الإدارة موجود', `الرمز محفوظ في Firebase: ${codeSnap.val()}`);
        } else {
            diagResult('tests-connection', 'warning', 'رمز الإدارة غير موجود في Firebase', 'سيُستخدم الرمز الافتراضي ADMIN26');
        }
    } catch(e) {
        diagResult('tests-connection', 'error', 'خطأ في قراءة رمز الإدارة', e.message);
    }

    diagSetDot('dot-connection', diagCounts.major > 0 ? '#ef4444' : '#22c55e');

    // ─── GROUP 2: DATABASE READ ─────────────────────────
    diagSetDot('dot-data', '#fbbf24');
    const dbNodes = [
        { path: 'rooms',         label: 'قاعدة الغرف',        severity: 'error',   container: 'tests-data' },
        { path: 'reports',       label: 'البلاغات',           severity: 'warning', container: 'tests-data' },
        { path: 'bans',          label: 'الحظورات',           severity: 'warning', container: 'tests-data' },
        { path: 'wordLists',     label: 'قوائم الكلمات',      severity: 'warning', container: 'tests-data' },
        { path: 'announcements', label: 'الإعلانات',          severity: 'warning', container: 'tests-data' },
    ];

    // Players: test separately with special handling for permission rules
    step_('قراءة بيانات اللاعبين...');
    await delay(80);
    let playerCount = 0;
    try {
        const pSnap = await get(ref(db, 'players'));
        playerCount = pSnap.exists() ? Object.keys(pSnap.val()).length : 0;
        if (playerCount > 0) {
            diagResult('tests-data', 'pass', 'قراءة players', `${playerCount} لاعب — ✅ يعمل`);
        } else {
            diagResult('tests-data', 'info', 'قراءة players', 'العقدة فارغة (لا يوجد لاعبون بعد)');
        }
    } catch(e) {
        if (e.message && (e.message.includes('Permission') || e.message.includes('permission'))) {
            diagResult('tests-data', 'error', 'players — رُفض الوصول (Firebase Rules)',
                `قواعد Firebase تمنع قراءة كل اللاعبين. أضف هذه القاعدة في Firebase Console:<br>
                <code style="font-family:monospace;font-size:10px;background:rgba(0,0,0,.4);padding:4px 8px;border-radius:4px;display:inline-block;margin-top:4px;direction:ltr;">
                "players": { ".read": "auth != null && root.child('players').child(auth.uid).child('isAdmin').val() === true" }
                </code>`);
        } else {
            diagResult('tests-data', 'major', 'خطأ في قراءة players', e.message);
        }
    }
    
    for (const node of dbNodes) {
        step_(`قراءة ${node.label}...`);
        await delay(80);
        try {
            const snap = await get(ref(db, node.path));
            const count = snap.exists() ? Object.keys(snap.val()).length : 0;
            diagResult(node.container, count > 0 ? 'pass' : 'info',
                `قراءة ${node.path}`,
                snap.exists() ? `${count} سجل — ✅ يعمل` : 'العقدة فارغة (لا توجد سجلات بعد)');
        } catch(e) {
            diagResult(node.container, node.severity, `خطأ في قراءة ${node.path}`, e.message);
        }
    }
    diagSetDot('dot-data', '#22c55e');

    // ─── GROUP 3: STATS FUNCTIONS ───────────────────────
    diagSetDot('dot-stats', '#fbbf24');
    step_('فحص وظائف الإحصائيات...');
    await delay(100);

    // Read players for stats
    let statsPlayers = [];
    if (playerCount > 0) {
        try {
            const ps = await get(ref(db, 'players'));
            if (ps.exists()) statsPlayers = Object.values(ps.val());
        } catch(e) {}
    }

    // Player count
    if (statsPlayers.length === 0) {
        diagResult('tests-stats', 'warning', 'لا يوجد لاعبون في الذاكرة',
            'إما أن قاعدة البيانات فارغة، أو Firebase Rules تمنع قراءة players (راجع نتائج فحص قاعدة البيانات أعلاه)');
    } else {
        diagResult('tests-stats', 'pass', 'بيانات اللاعبين محمّلة', `${statsPlayers.length} لاعب في الذاكرة`);
    }

    step_('فحص إحصائيات اللاعبين...');
    await delay(80);

    // Player field integrity
    const withUsername = statsPlayers.filter(p => p.username).length;
    const withRank     = statsPlayers.filter(p => p.rank).length;
    const withStats    = statsPlayers.filter(p => p.stats).length;
    const withPoints   = statsPlayers.filter(p => typeof p.rankPoints === 'number').length;
    const missing      = [];
    if (withUsername < statsPlayers.length) missing.push(`${statsPlayers.length - withUsername} بلا username`);
    if (withRank     < statsPlayers.length) missing.push(`${statsPlayers.length - withRank} بلا rank`);
    if (withStats    < statsPlayers.length) missing.push(`${statsPlayers.length - withStats} بلا stats`);
    if (withPoints   < statsPlayers.length) missing.push(`${statsPlayers.length - withPoints} بلا rankPoints`);

    if (missing.length) {
        diagResult('tests-stats', 'warning', 'حقول مفقودة في بعض اللاعبين', missing.join(' | '));
    } else if (statsPlayers.length > 0) {
        diagResult('tests-stats', 'pass', 'حقول اللاعبين مكتملة', 'username ✓ rank ✓ stats ✓ rankPoints ✓');
    }

    step_('فحص حسابات الفوز...');
    await delay(80);

    // Check win rate calculation
    let wr_ok = 0, wr_bad = 0;
    statsPlayers.forEach(p => {
        const total = p.stats?.totalGames || 0;
        const wins  = (p.stats?.spyWins||0) + (p.stats?.innocentWins||0);
        if (total > 0 && wins > total) wr_bad++;
        else wr_ok++;
    });
    if (wr_bad > 0) {
        diagResult('tests-stats', 'error', 'بيانات فوز غير منطقية', `${wr_bad} لاعب لديه انتصارات > مباريات`);
    } else if (wr_ok > 0) {
        diagResult('tests-stats', 'pass', 'حسابات الفوز سليمة', `${wr_ok} لاعب — لا تناقضات`);
    }

    step_('فحص توزيع الرتب...');
    await delay(80);

    // Rank distribution
    const validRanks = ['Bronze','Silver','Gold','Platinum','Diamond'];
    const invalidRankPlayers = statsPlayers.filter(p => p.rank && !validRanks.includes(p.rank));
    if (invalidRankPlayers.length) {
        diagResult('tests-stats', 'warning', 'رتب غير معروفة',
            invalidRankPlayers.map(p => `${p.username}: ${p.rank}`).slice(0, 5).join(', '));
    } else if (statsPlayers.length > 0) {
        diagResult('tests-stats', 'pass', 'قيم الرتب صحيحة', validRanks.join(' | '));
    }

    diagSetDot('dot-stats', '#22c55e');

    // ─── GROUP 4: DATA INTEGRITY ───────────────────────
    diagSetDot('dot-integrity', '#fbbf24');
    step_('فحص سلامة البيانات...');
    await delay(100);

    // Active bans
    try {
        const bansSnap = await get(ref(db, 'bans'));
        if (bansSnap.exists()) {
            const bans = Object.entries(bansSnap.val());
            const expired = bans.filter(([,b]) => !b.permanent && b.expiresAt && b.expiresAt < Date.now());
            if (expired.length) {
                diagResult('tests-integrity', 'warning', 'حظورات منتهية الصلاحية',
                    `${expired.length} حظر منتهٍ لم يُنظَّف — يمكن مسحها يدوياً`);
            } else {
                diagResult('tests-integrity', 'pass', 'الحظورات نظيفة', `${bans.length} حظر نشط، لا منتهية`);
            }
        } else {
            diagResult('tests-integrity', 'info', 'لا توجد حظورات', 'جدول bans فارغ');
        }
    } catch(e) {
        diagResult('tests-integrity', 'error', 'خطأ في فحص الحظورات', e.message);
    }

    step_('فحص البلاغات المعلقة...');
    await delay(80);

    // Pending reports
    try {
        const reportsSnap = await get(ref(db, 'reports'));
        if (reportsSnap.exists()) {
            const pendingReports = Object.values(reportsSnap.val()).filter(r => r.status === 'pending').length;
            if (pendingReports > 10) {
                diagResult('tests-integrity', 'warning', 'بلاغات معلقة كثيرة', `${pendingReports} بلاغ لم يُعالج`);
            } else if (pendingReports > 0) {
                diagResult('tests-integrity', 'info', `${pendingReports} بلاغ معلق`, 'تحقق من قسم البلاغات');
            } else {
                diagResult('tests-integrity', 'pass', 'لا بلاغات معلقة', 'جميع البلاغات معالجة');
            }
        } else {
            diagResult('tests-integrity', 'info', 'لا توجد بلاغات', 'جدول reports فارغ');
        }
    } catch(e) {
        diagResult('tests-integrity', 'warning', 'تعذّر فحص البلاغات', e.message);
    }

    step_('فحص غرف اللعب...');
    await delay(80);

    // Rooms
    try {
        const roomsSnap = await get(ref(db, 'rooms'));
        if (roomsSnap.exists()) {
            const rooms = Object.values(roomsSnap.val());
            const stale = rooms.filter(r => r.status === 'playing' && (!r.players || Object.keys(r.players||{}).length < 2));
            const active = rooms.filter(r => r.status === 'waiting' || r.status === 'playing');
            if (stale.length) {
                diagResult('tests-integrity', 'warning', 'غرف علقت في حالة playing', `${stale.length} غرفة بلاعبين أقل من 2`);
            } else {
                diagResult('tests-integrity', 'pass', 'الغرف سليمة', `${active.length} غرفة نشطة`);
            }
        } else {
            diagResult('tests-integrity', 'info', 'لا توجد غرف', 'جدول rooms فارغ');
        }
    } catch(e) {
        diagResult('tests-integrity', 'warning', 'تعذّر فحص الغرف', e.message);
    }

    diagSetDot('dot-integrity', '#22c55e');

    // ─── GROUP 5: FUNCTION AVAILABILITY ───────────────
    diagSetDot('dot-functions', '#fbbf24');
    step_('فحص توفر الوظائف...');
    await delay(100);

    const requiredFns = [
        ['refreshAll',         'تحديث البيانات'],
        ['showSection',        'التنقل بين الأقسام'],
        ['banPlayer',          'حظر لاعب'],
        ['unban',              'رفع الحظر'],
        ['loadPlayers',        'تحميل اللاعبين'],
        ['searchPlayers',      'البحث عن لاعب'],
        ['viewPlayer',         'عرض بيانات لاعب'],
        ['loadBans',           'تحميل الحظورات'],
        ['loadReports',        'تحميل البلاغات'],
        ['filterReports',      'تصفية البلاغات'],
        ['searchReports',      'البحث في البلاغات'],
        ['resolveReport',      'حل البلاغ'],
        ['banFromReport',      'حظر من بلاغ'],
        ['viewReportDetail',   'عرض تفاصيل البلاغ'],
        ['closeReportDetail',  'إغلاق تفاصيل البلاغ'],
        ['loadWords',          'تحميل الكلمات'],
        ['selectCategory',     'اختيار فئة'],
        ['addWord',            'إضافة كلمة'],
        ['deleteWord',         'حذف كلمة'],
        ['addCategory',        'إضافة فئة'],
        ['loadAnnouncements',  'تحميل الإعلانات'],
        ['sendAnnouncement',   'إرسال إعلان'],
        ['deleteAnn',          'حذف إعلان'],
        ['setPriority',        'تحديد الأولوية'],
        ['loadAdminsList',     'قائمة المسؤولين'],
        ['revokeAdmin',        'إلغاء صلاحيات'],
        ['generateNewCode',    'إنشاء رمز جديد'],
        ['copyAdminCode',      'نسخ الرمز'],
        ['verifyAdminCode',    'التحقق من الرمز'],
        ['runDiagnostics',     'تشغيل التشخيص'],
        ['clearDiagnostics',   'مسح التشخيص'],
        ['repairPlayerRecords','إصلاح تلقائي'],
        ['manualPatchPlayer',  'إصلاح يدوي'],
        ['onPatchSelectChange','اختيار لاعب للإصلاح'],
    ];

    let fnMissing = 0;
    for (const [fn, label] of requiredFns) {
        if (typeof window[fn] === 'function') {
            diagResult('tests-functions', 'pass', `${label}`, `window.${fn}() ✓`);
        } else {
            diagResult('tests-functions', 'error', `وظيفة مفقودة: ${fn}`, `${label} — window.${fn} غير معرّفة`);
            fnMissing++;
        }
        await delay(20);
    }
    step_('اكتمل فحص الوظائف');

    if (fnMissing === 0) {
        diagResult('tests-functions', 'pass', 'جميع الوظائف متاحة', `${requiredFns.length}/${requiredFns.length} وظيفة تعمل`);
    } else {
        diagResult('tests-functions', 'error', `${fnMissing} وظيفة مفقودة`, 'تحقق من تحميل ملفات JS');
    }
    diagSetDot('dot-functions', fnMissing ? '#ef4444' : '#22c55e');

    // ─── GROUP 6: CONTENT CHECK ────────────────────────
    diagSetDot('dot-content', '#fbbf24');
    step_('فحص محتوى قوائم الكلمات...');
    await delay(100);

    try {
        const wSnap = await get(ref(db, 'wordLists'));
        if (!wSnap.exists()) {
            diagResult('tests-content', 'warning', 'قوائم الكلمات فارغة',
                'لا توجد فئات في wordLists — اللعبة ستستخدم الكلمات المدمجة فقط');
        } else {
            const wData = wSnap.val();
            const cats  = Object.keys(wData);
            let emptyCats = 0, totalWords = 0;
            cats.forEach(c => {
                const arr = Array.isArray(wData[c]) ? wData[c] : Object.keys(wData[c]);
                totalWords += arr.length;
                if (arr.length === 0) emptyCats++;
            });
            if (emptyCats) {
                diagResult('tests-content', 'warning', 'فئات فارغة', `${emptyCats} فئة بدون كلمات من أصل ${cats.length}`);
            }
            diagResult('tests-content', cats.length > 0 ? 'pass' : 'warning', 'قوائم الكلمات',
                `${cats.length} فئة | ${totalWords} كلمة إجمالاً`);
        }
    } catch(e) {
        diagResult('tests-content', 'error', 'خطأ في قراءة قوائم الكلمات', e.message);
    }

    step_('فحص الإعلانات المنتهية...');
    await delay(80);

    // Expired announcements
    try {
        const annSnap = await get(ref(db, 'announcements'));
        if (annSnap.exists()) {
            const anns = Object.entries(annSnap.val());
            const expired = anns.filter(([,a]) => a.expiresAt < Date.now());
            const active  = anns.length - expired.length;
            if (expired.length > 5) {
                diagResult('tests-content', 'warning', 'إعلانات منتهية الصلاحية',
                    `${expired.length} إعلان منتهٍ — يمكن حذفها لتنظيف قاعدة البيانات`);
            } else {
                diagResult('tests-content', 'pass', 'الإعلانات',
                    `${active} نشط | ${expired.length} منتهٍ`);
            }
        } else {
            diagResult('tests-content', 'info', 'لا توجد إعلانات', 'جدول announcements فارغ');
        }
    } catch(e) {
        diagResult('tests-content', 'warning', 'خطأ في فحص الإعلانات', e.message);
    }

    // Chart.js availability
    step_('فحص مكتبات الرسوم البيانية...');
    await delay(80);
    if (typeof Chart !== 'undefined') {
        diagResult('tests-content', 'pass', 'Chart.js متاح', `الإصدار: ${Chart.version || 'غير معروف'}`);
    } else {
        diagResult('tests-content', 'error', 'Chart.js غير محمّل', 'الرسوم البيانية في قسم التحليلات لن تعمل');
    }

    diagSetDot('dot-content', '#22c55e');

    // ─── DONE ──────────────────────────────────────────
    diagProgress(TOTAL, TOTAL, 'اكتمل الفحص');
    diagUpdateCounters();

    const total = diagCounts.major + diagCounts.error + diagCounts.warning + diagCounts.pass;
    const emoji = diagCounts.major > 0 ? '🔴' : diagCounts.error > 0 ? '🟠' : diagCounts.warning > 0 ? '🟡' : '🟢';
    diagLog += `\n=== النتيجة: ${emoji} ${diagCounts.major} جسيم | ${diagCounts.error} خطأ | ${diagCounts.warning} تحذير | ${diagCounts.pass} ناجح ===\n`;
    const logEl = document.getElementById('diag-log');
    if (logEl) logEl.textContent = diagLog;

    setTimeout(() => {
        const progress = document.getElementById('diag-progress-wrap');
        if (progress) progress.style.display = 'none';
    }, 1500);

    if (btn) {
        btn.innerHTML = '<i class="fas fa-check ml-2"></i>اكتمل الفحص';
        btn.disabled = false;
        setTimeout(() => {
            btn.innerHTML = '<i class="fas fa-play ml-2"></i>إعادة الفحص';
        }, 2000);
    }
    
    diagRunning = false;
};

console.log('[Diagnostics] Module loaded successfully');