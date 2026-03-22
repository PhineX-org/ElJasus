// ============================================================
// EL JASUS — JMS (El Jasus Moderation System) v3.0
// ============================================================

(function () {
'use strict';

// ══════════════════════════════════════════════════════════
// SYMBOL SUBSTITUTION MAP
// Normalizes common symbol tricks like k0s → كوس
// ══════════════════════════════════════════════════════════
const SYMBOL_MAP = {
    // Numbers to letters
    '0': ['o', 'ο', 'о', '٠'],
    '1': ['i', 'l', '١'],
    '3': ['e', '٣'],
    '4': ['a', '٤'],
    '5': ['s', '٥'],
    '7': ['h', '٧'],
    '8': ['b', '٨'],
    '9': ['g', '٩'],
    
    // Symbols to letters
    '$': ['s'],
    '@': ['a'],
    '!': ['i'],
    '|': ['i', 'l'],
    '&': ['and'],
    '*': ['a', 'o'],
    '#': ['h'],
    '%': ['x'],
    
    // Special characters
    '.': [''],
    '-': [''],
    '_': [''],
    ' ': [''],
    '/': [''],
    '\\': [''],
    '~': [''],
    '+': [''],
};

// ══════════════════════════════════════════════════════════
// 5-LEVEL VIOLATION CLASSIFICATION
// Each level has: warnings threshold, ban duration, severity
// ══════════════════════════════════════════════════════════
const LEVELS = {
    1: {
        name: 'المستوى الأول',
        nameEn: 'Level 1',
        icon: '⚠️',
        color: '#f59e0b',
        warningsThreshold: 10,
        banDuration: 3 * 864e5, // 3 days
        severity: 'تحذير خفيف',
    },
    2: {
        name: 'المستوى الثاني',
        nameEn: 'Level 2',
        icon: '🔶',
        color: '#f97316',
        warningsThreshold: 5,
        banDuration: 1 * 864e5, // 1 day (24-48 hours average)
        severity: 'حظر مؤقت خفيف',
    },
    3: {
        name: 'المستوى الثالث',
        nameEn: 'Level 3',
        icon: '🔴',
        color: '#ef4444',
        warningsThreshold: 3,
        banDuration: 10 * 864e5, // 10 days (7-14 average)
        severity: 'حظر مؤقت شديد',
    },
    4: {
        name: 'المستوى الرابع',
        nameEn: 'Level 4',
        icon: '🟣',
        color: '#a855f7',
        warningsThreshold: 1,
        banDuration: 45 * 864e5, // 45 days (30-60 average)
        severity: 'حظر طويل',
    },
    5: {
        name: 'المستوى الخامس',
        nameEn: 'Level 5',
        icon: '☠️',
        color: '#000000',
        warningsThreshold: 0,
        banDuration: -1, // Permanent
        severity: 'حظر دائم',
    },
};

// ══════════════════════════════════════════════════════════
// BLOCKED WORDS BY LEVEL
// ══════════════════════════════════════════════════════════
const VIOLATIONS = {
    // ── Level 1: Minor inappropriate language ────────────────
    1: {
    words: [
        // ========== ARABIC (original + extensive additions) ==========
        'غبي', 'غبية', 'أهبل', 'عبيط', 'حمار', 'جحش', 'بهيمة', 'حيوان',
        'زبالة', 'وسخ', 'حقير', 'نعل', 'تبا', 'ملعون', 'لعنة', 'قذر',
        'مقرف', 'سافل', 'تافه', 'سخيف', 'كلب', 'بقرة', 'ماعز', 'خنزير',
        // Additional Arabic (minor profanity, insults, vulgar slang)
        'أحمق', 'بليد', 'معتوه', 'مريض', 'خسيس', 'وضيع', 'دنيء', 'لئيم',
        'فاشل', 'خايب', 'ساقط', 'نذل', 'رعاع', 'أوغاد', 'جبان', 'متخلف',
        'جاهل', 'أبله', 'ساذج', 'مغفل', 'قبيح', 'بذيء', 'وقح', 'صفيق',
        'كذاب', 'نصاب', 'مارق', 'فاجر', 'ماكر', 'حقود', 'حسود', 'أناني',
        'مغرور', 'متكبر', 'فظ', 'غليظ', 'أخرق', 'أبكم', 'أطرش', 'أعمى',
        'أعرج', 'أصلع', 'أقرع', 'أحدب', 'أشوه', 'أرعن', 'أرعن', 'أهوج',
        'أحمق', 'أبله', 'أعور', 'أشل', 'أكمه', 'أصم', 'أبتر', 'أجدع',
        'نكد', 'نكدي', 'زفت', 'زبالة', 'قمامة', 'عاهرة', 'قحبة', 'شرموطة',
        'منيوك', 'ناكح', 'متناك', 'لحس', 'كس', 'كسي', 'طيز', 'مص', 'بوس',
        'نياكة', 'لحس', 'خرا', 'خرة', 'خربان', 'خربوطي', 'مخرب', 'فاسد',
        'منحط', 'ساقط', 'خنزير', 'كلب', 'ابن الكلب', 'بنت الكلب', 'أمك',
        'أختك', 'دينك', 'عرضك', 'شرفك', 'كلبك', 'أبوك', 'أمك', 'بنت',
        'شرموط', 'قواد', 'ديوث', 'داعر', 'فاجر', 'زاني', 'زانية', 'لوطي',
        'لوطية', 'منكوح', 'منكوحة', 'متناكة', 'منيوكة', 'مصاص', 'مصاصة',
        'نياك', 'نياكة', 'خول', 'خولة', 'خنيث', 'مخنث', 'لطي', 'لطية',
        'قحبة', 'عاهرة', 'مومس', 'دعارة', 'زنا', 'زنى', 'سفاح', 'سفاحة',
        'فاحشة', 'منكر', 'قذر', 'وسخ', 'نجس', 'نجاسة', 'رجيع', 'براز',
        'بول', 'بائل', 'بولة', 'خراء', 'خرئ', 'خرة', 'خرية', 'عذرة',
        'عذرة', 'غائط', 'غائطة', 'كخة', 'كخ', 'قرف', 'مقرف', 'مقزز',
        'مقزز', 'كريه', 'مكروه', 'بغيض', 'مبغض', 'ممقوت', 'منفور', 'مكروه',
        'حقير', 'تافه', 'سخيف', 'رذيل', 'دني', 'وضيع', 'سافل', 'خسيس',
        'لئيم', 'ماكر', 'غدار', 'خائن', 'غاش', 'نصاب', 'محتال', 'مخادع',
        'كذاب', 'زور', 'زوري', 'منافق', 'مرائي', 'مريب', 'مشبوه', 'مريب',
        'مريض', 'معتوه', 'مجنون', 'مختل', 'ممسوخ', 'مشوه', 'مشكل', 'مشوش',
        'فاشل', 'خاسر', 'خسران', 'خسرانه', 'بايع', 'بايع', 'خايب', 'خايبة',
        'بايز', 'بايزة', 'باين', 'باينة', 'خربان', 'خربانة', 'مخرب', 'مخربة',
        'فاسد', 'فاسدة', 'منحط', 'منحطة', 'ساقط', 'ساقطة', 'نذل', 'نذلة',
        'وغد', 'وغدة', 'أرذل', 'أرذلة', 'أدنى', 'أدناء', 'أخس', 'أخساء',
        'ألأم', 'ألئام', 'أوضاع', 'أوضاع', 'أرذال', 'أوغاد', 'أشقياء',
        'أشرار', 'أشرار', 'أنجاس', 'أرجاس', 'أقذار', 'أوساخ',
        // Additional variations / common insults
        'يا حمار', 'يا كلب', 'يا خنزير', 'يا تيس', 'يا تيسة', 'يا ثور',
        'يا ثور', 'يا جحش', 'يا بهيمة', 'يا حيوان', 'يا غبي', 'يا أهبل',
        'يا عبيط', 'يا سافل', 'يا حقير', 'يا نذل', 'يا رعاع', 'يا زبالة',
        'يا وسخ', 'يا قذر', 'يا مقرف', 'يا تافه', 'يا سخيف', 'يا فاشل',
        'يا خايب', 'يا معتوه', 'يا مريض', 'يا مجنون', 'يا مختل', 'يا أحمق',
        'يا بليد', 'يا أبله', 'يا ساذج', 'يا مغفل', 'يا قبيح', 'يا بذيء',
        'يا وقح', 'يا صفيق', 'يا جبان', 'يا متخلف', 'يا جاهل', 'يا خسيس',
        'يا وضيع', 'يا دنيء', 'يا لئيم', 'يا ماكر', 'يا غدار', 'يا خائن',
        'يا غاش', 'يا نصاب', 'يا محتال', 'يا مخادع', 'يا كذاب', 'يا منافق',
        'يا مرائي', 'يا مريب', 'يا مشبوه',

        // ========== ENGLISH (original + extensive additions) ==========
        // Original
        'stupid', 'idiot', 'dumb', 'noob', 'loser', 'trash', 'garbage',
        'fool', 'moron', 'dumbass', 'asshole', 'peace of shit', 'shit',
        // Extensive additions (mild to moderate profanity, insults, gamer slang)
        'dummy', 'imbecile', 'cretin', 'ignoramus', 'buffoon', 'jerk',
        'crap', 'damn', 'hell', 'poop', 'butt', 'ass', 'idiotic',
        'moronic', 'brainless', 'mindless', 'simpleton', 'n00b', 'newb',
        'scrub', 'pleb', 'dickhead', 'jackass', 'douche', 'douchebag',
        'bastard', 'bitch', 'wanker', 'prick', 'twat', 'cunt', 'fuck',
        'fucker', 'motherfucker', 'mf', 'bullshit', 'horseshit', 'crap',
        'damn', 'dammit', 'goddamn', 'goddam', 'goddammit', 'heck', 'frick',
        'frig', 'freak', 'frigging', 'freaking', 'eff', 'effing', 'suck',
        'sucks', 'sucker', 'sucka', 'chump', 'schmuck', 'putz', 'dweeb',
        ],
        patterns: [
            /(.)\1{6,}/,  // Spam: same char 7+ times
            /^\s*(.+?)\s*\1\s*\1/,  // Repeated words 3+ times
        ],
        category: 'minor_profanity',
        description: 'ألفاظ غير لائقة خفيفة',
    },

    // ── Level 2: Moderate harassment ──────────────────────────
    2: {
        words: [
            'عرص', 'عرصة', 'معرص', 'خول', 'خولة', 'كلب', 'ابن كلب',
            'متخلف', 'بربري', 'همجي', 'زق', 'خرا', 'خري',
            'ass', 'asshole', 'jerk', 'bastard', 'prick', 'douche',
            'wanker', 'jackass', 'dipshit', 'arse',
        ],
        category: 'harassment',
        description: 'تحرش لفظي وإزعاج',
    },

    // ── Level 3: Severe profanity ─────────────────────────────
    3: {
        words: [
            'كس', 'كوس', 'بص', 'بصص', 'زبر', 'أير', 'اير', 'زب',
            'نيك', 'ينيك', 'انيك', 'تنيك', 'مناك', 'منيوك', 'تناك',
            'شرموط', 'شرموطة', 'شرموته', 'قحبة', 'قحب', 'متناك',
            'فشخ', 'فشخك', 'يفشخ', 'تفشيخ', 'طيز', 'مكوة',
            'كسمك', 'كسامك', 'مكوتك', 'طيزك', 'لحس',
            'fuck', 'fucking', 'fucker', 'motherfucker', 'shit',
            'bitch', 'pussy', 'dick', 'cock', 'cunt', 'twat',
            // Franco-Arabic
            'kosomak', 'ksomak', 'ksmk', 'metnak', 'metnaka',
            'sharmota', 'sharmouta', 'mnyok', 'mnywk', 'a7a', 'aha',
            'khawal', 'khwal', 'ars', '3ars', 'mo3ars',
        ],
        category: 'severe_profanity',
        description: 'ألفاظ بذيئة شديدة',
    },

    // ── Level 4: Hate speech & threats ────────────────────────
    4: {
        words: [
            // Hate speech
            'عبد', 'زنجي', 'عنصري', 'nigger', 'nigga', 'n1gga',
            'faggot', 'fag', 'retard',
            // Sexual harassment
            'عاهرة', 'مومس', 'قواد', 'ديوث', 'لواط', 'لوطي',
            'شاذ', 'منحرف', 'مخنث', 'whore', 'slut', 'skank',
            'pedo', 'pedophile', 'rape',
            // Mild threats
            'اقتلك', 'اقتله', 'اذبحك', 'اذبحه', 'سأقتلك',
            'امسحك', 'ادعسك', 'kill you', 'beat you',
        ],
        category: 'hate_speech',
        description: 'خطاب كراهية وتهديدات',
    },

    // ── Level 5: Severe threats ───────────────────────────────
    5: {
        words: [
            'ارهابي', 'تفجير', 'اغتيال', 'اغتصاب',
            'terrorist', 'bomb', 'murder', 'assassination',
            'strangle', 'cut your throat',
        ],
        patterns: [
            /(?:اعرف|عارف|موجود)\s*(?:في|ب)?(?:مكان|عنوان|بيت)/i,
            /i\s*know\s*where\s*you\s*live/i,
            /gonna\s*find\s*you/i,
        ],
        category: 'severe_threats',
        description: 'تهديدات جسيمة',
    },
};

// ══════════════════════════════════════════════════════════
// CATEGORIES METADATA
// ══════════════════════════════════════════════════════════
const CATEGORIES = {
    minor_profanity:    { ar: 'ألفاظ غير لائقة خفيفة',    icon: '⚠️',  color: '#f59e0b' },
    harassment:         { ar: 'تحرش وإزعاج',              icon: '🔶', color: '#f97316' },
    severe_profanity:   { ar: 'ألفاظ بذيئة شديدة',       icon: '🔴', color: '#ef4444' },
    hate_speech:        { ar: 'خطاب كراهية وتهديدات',    icon: '🟣', color: '#a855f7' },
    severe_threats:     { ar: 'تهديدات جسيمة',            icon: '☠️',  color: '#000000' },
    spam:               { ar: 'رسائل مزعجة',              icon: '📵', color: '#8b5cf6' },
    admin_decision:     { ar: 'قرار إداري',               icon: '🔨', color: '#1d4ed8' },
    permanent:          { ar: 'حظر دائم',                 icon: '⛔', color: '#000' },
};

// ══════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════
const PERM_BAN_THRESHOLD  = 3;           // Total bans before permanent
const RECHECK_INTERVAL_MS = 30_000;      // Re-check Firebase every 30s

// LocalStorage keys
const LS_BAN  = 'eljasus_ban_v4';
const LS_WARN = 'eljasus_warnings_v4';

// Internal state
let _db          = null;
let _user        = null;
let _unsubBan    = null;
let _recheckTimer = null;
let _screenShown = false;
let _navLocked   = false;

// ══════════════════════════════════════════════════════════
// TEXT NORMALIZATION
// ══════════════════════════════════════════════════════════
function normArabic(s) {
    return s
        .toLowerCase()
        .replace(/[\u064b-\u065f\u0670]/g, '')  // Remove diacritics
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .trim();
}

function expandSymbols(text) {
    // Generate all possible combinations by expanding symbols
    const chars = text.toLowerCase().split('');
    let results = [''];
    
    for (let char of chars) {
        const replacements = SYMBOL_MAP[char] || [char];
        const newResults = [];
        for (let result of results) {
            for (let replacement of replacements) {
                newResults.push(result + replacement);
            }
        }
        results = newResults;
        // Limit combinations to prevent explosion
        if (results.length > 100) {
            results = results.slice(0, 100);
        }
    }
    
    return results;
}

function cleanText(text) {
    // Remove spaces, dots, dashes, special chars
    return text
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()\[\]'"<>|\\+ ]/g, '')
        .toLowerCase();
}

function normalizeText(text) {
    const cleaned = cleanText(text);
    const arabicNorm = normArabic(cleaned);
    
    // Generate variations with symbol expansion
    const variations = new Set([
        cleaned,
        arabicNorm,
        ...expandSymbols(cleaned),
    ]);
    
    return Array.from(variations);
}

// ══════════════════════════════════════════════════════════
// VIOLATION DETECTION
// Returns { level, category, word } or null
// ══════════════════════════════════════════════════════════
function detectViolation(text) {
    const variations = normalizeText(text);
    
    // Check each level from most severe (5) to least (1)
    for (let level = 5; level >= 1; level--) {
        const violation = VIOLATIONS[level];
        
        // Check patterns first (for level 1 spam and level 5 threats)
        if (violation.patterns) {
            for (let pattern of violation.patterns) {
                if (pattern.test(text)) {
                    return {
                        level,
                        category: violation.category,
                        word: '<pattern match>',
                        description: violation.description,
                    };
                }
            }
        }
        
        // Check words
        for (let badWord of violation.words) {
            const normalizedBadWord = cleanText(normArabic(badWord));
            
            for (let variant of variations) {
                if (variant.includes(normalizedBadWord)) {
                    return {
                        level,
                        category: violation.category,
                        word: badWord,
                        description: violation.description,
                    };
                }
            }
        }
    }
    
    return null;
}

// ══════════════════════════════════════════════════════════
// FIREBASE HELPERS
// ══════════════════════════════════════════════════════════
function fbFns() {
    if (window._firebaseFns) return window._firebaseFns;
    if (window.firebase?.database) return {
        ref:      (db, path) => firebase.database().ref(path),
        get:      r          => r.once('value'),
        update:   (r, v)     => r.update(v),
        set:      (r, v)     => r.set(v),
        remove:   r          => r.remove(),
        onValue:  (r, cb)    => { r.on('value', cb); return () => r.off('value', cb); },
        serverTimestamp: ()  => firebase.database.ServerValue.TIMESTAMP,
    };
    return null;
}

async function dbGet(path) {
    const f = fbFns(); if (!f || !_db) return null;
    try { const s = await f.get(f.ref(_db, path)); return s.exists() ? s.val() : null; }
    catch { return null; }
}

async function dbUpdate(path, value) {
    const f = fbFns(); if (!f || !_db) return;
    try { await f.update(f.ref(_db, path), value); } catch(e) { console.warn('[MOD] update failed', e); }
}

async function dbSet(path, value) {
    const f = fbFns(); if (!f || !_db) return;
    try { await f.set(f.ref(_db, path), value); } catch(e) { console.warn('[MOD] set failed', e); }
}

// ══════════════════════════════════════════════════════════
// LOCAL STORAGE
// ══════════════════════════════════════════════════════════
function lsBan(obj) {
    if (obj === null) { localStorage.removeItem(LS_BAN); return; }
    localStorage.setItem(LS_BAN, JSON.stringify(obj));
}
function lsGetBan() {
    try { const v = localStorage.getItem(LS_BAN); return v ? JSON.parse(v) : null; } catch { return null; }
}
function lsWarnings()  { return parseInt(localStorage.getItem(LS_WARN) || '0', 10); }
function lsSetWarn(n)  { localStorage.setItem(LS_WARN, String(n)); }

// ══════════════════════════════════════════════════════════
// WARNINGS MANAGEMENT
// ══════════════════════════════════════════════════════════
async function getWarnings() {
    if (!_user) return lsWarnings();
    const fb = await dbGet(`players/${_user.uid}/moderationWarnings`);
    const count = fb ?? 0;
    lsSetWarn(count);
    return count;
}

async function addWarning() {
    const current = await getWarnings();
    const next = current + 1;
    lsSetWarn(next);
    if (_user) await dbUpdate(`players/${_user.uid}`, { moderationWarnings: next });
    return next;
}

async function resetWarnings() {
    lsSetWarn(0);
    if (_user) await dbUpdate(`players/${_user.uid}`, { moderationWarnings: 0 });
}

// ══════════════════════════════════════════════════════════
// BAN OBJECT CREATION
// ══════════════════════════════════════════════════════════
async function buildBanObj(reason, category, level, bannedBy) {
    let banCount = 1;
    if (_user) {
        banCount = (await dbGet(`players/${_user.uid}/totalBans`) ?? 0) + 1;
    }
    
    const levelConfig = LEVELS[level] || LEVELS[3];
    const isPermanent = (levelConfig.banDuration === -1) || (banCount >= PERM_BAN_THRESHOLD);
    const expiresAt = isPermanent ? -1 : Date.now() + levelConfig.banDuration;

    return {
        reason,
        category,
        level,
        bannedAt:    Date.now(),
        expiresAt,
        durationMs:  isPermanent ? -1 : levelConfig.banDuration,
        bannedBy:    bannedBy || 'system',
        isPermanent,
        banCount,
    };
}

// ══════════════════════════════════════════════════════════
// BAN MANAGEMENT
// ══════════════════════════════════════════════════════════
async function issueBan(reason, category, level, bannedBy) {
    const ban = await buildBanObj(reason, category, level, bannedBy);

    if (_user) {
        // Save to ban history
        const histKey = `players/${_user.uid}/banHistory/${ban.bannedAt}`;
        await dbSet(histKey, {
            reason:    ban.reason,
            category:  ban.category,
            level:     ban.level,
            bannedAt:  ban.bannedAt,
            expiresAt: ban.expiresAt,
            durationMs: ban.durationMs,
        });
        
        await dbUpdate(`players/${_user.uid}`, {
            ban,
            totalBans: ban.banCount,
        });
        
        await dbSet(`banned_users/${_user.uid}`, {
            ...ban,
            uid:      _user.uid,
            username: _user.displayName || localStorage.getItem('eljasus_user_name') || 'مجهول',
            email:    _user.email || '',
        });
    }

    lsBan(ban);
    await resetWarnings();
    showBanScreen(ban);
}

async function liftBan() {
    lsBan(null);
    lsSetWarn(0);
    if (_user) {
        await dbUpdate(`players/${_user.uid}`, { ban: null, moderationWarnings: 0 });
        await dbSet(`banned_users/${_user.uid}`, null);
    }
    removeBanScreen();
}

// ══════════════════════════════════════════════════════════
// BAN CHECK
// ══════════════════════════════════════════════════════════
async function fetchActiveBan() {
    let ban = null;

    if (_user) {
        ban = await dbGet(`players/${_user.uid}/ban`);
    }

    if (!ban) ban = lsGetBan();
    if (!ban) return null;

    // Check expiry
    if (!ban.isPermanent && ban.expiresAt !== -1 && Date.now() >= ban.expiresAt) {
        await liftBan();
        return null;
    }

    lsBan(ban);
    return ban;
}

// ══════════════════════════════════════════════════════════
// NAVIGATION LOCKOUT
// ══════════════════════════════════════════════════════════
function lockNavigation() {
    if (_navLocked) return;
    _navLocked = true;

    history.pushState({ banned: true }, '', location.href);

    const blockNav = (e) => {
        history.pushState({ banned: true }, '', location.href);
        e.preventDefault?.();
        return false;
    };

    window.addEventListener('popstate', blockNav);
    window.addEventListener('hashchange', blockNav);

    const _pushState = history.pushState.bind(history);
    const _replaceState = history.replaceState.bind(history);

    history.pushState = function(state, title, url) {
        if (state?.banned) return _pushState(state, title, url);
        console.warn('[MOD] Navigation blocked — user is banned');
    };

    history.replaceState = function(state, title, url) {
        if (state?.banned) return _replaceState(state, title, url);
        console.warn('[MOD] Navigation blocked — user is banned');
    };
}

// ══════════════════════════════════════════════════════════
// FORMAT HELPERS
// ══════════════════════════════════════════════════════════
function fmtDuration(ms) {
    if (ms === -1 || ms === Infinity) return 'دائم ♾️';
    const d = Math.floor(ms / 864e5);
    const h = Math.floor((ms % 864e5) / 36e5);
    const parts = [];
    if (d > 0) parts.push(`${d} يوم`);
    if (h > 0) parts.push(`${h} ساعة`);
    return parts.join(' و ') || 'أقل من ساعة';
}

function fmtDate(ts) {
    if (!ts || ts === -1) return '—';
    return new Date(ts).toLocaleString('ar-SA', {
        year:'numeric', month:'long', day:'numeric',
        hour:'2-digit', minute:'2-digit'
    });
}

function fmtRemaining(expiresAt) {
    if (expiresAt === -1) return '♾️ دائم';
    const diff = expiresAt - Date.now();
    if (diff <= 0) return 'انتهى';
    return fmtDuration(diff);
}

// ══════════════════════════════════════════════════════════
// ENHANCED BAN SCREEN UI
// ══════════════════════════════════════════════════════════
function showBanScreen(ban) {
    document.documentElement.style.cssText += ';overflow:hidden!important';
    document.body.style.cssText += ';overflow:hidden!important;pointer-events:none!important';

    lockNavigation();
    document.getElementById('_ej_ban')?.remove();

    const level = ban.level || 3;
    const levelConfig = LEVELS[level] || LEVELS[3];
    const cat = CATEGORIES[ban.category] || CATEGORIES.severe_profanity;
    const isPerm = ban.isPermanent || ban.expiresAt === -1;

    const overlay = document.createElement('div');
    overlay.id = '_ej_ban';
    overlay.style.cssText = `
        position:fixed;inset:0;z-index:2147483647;
        background:radial-gradient(ellipse at 50% 0%,#2a0008 0%,#0a0e1a 55%,#07000d 100%);
        display:flex;align-items:center;justify-content:center;
        font-family:'Cairo',sans-serif;overflow-y:auto;padding:20px;box-sizing:border-box;
        pointer-events:all;`;

    const remainingId = `_rem_${Date.now()}`;

    overlay.innerHTML = `
<style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Orbitron:wght@700;900&display=swap');
    @keyframes _bpulse{0%,100%{opacity:.03}50%{opacity:.09}}
    @keyframes _bspin {from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes _bfade {from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    @keyframes _bglow {0%,100%{box-shadow:0 0 20px ${levelConfig.color}40}50%{box-shadow:0 0 40px ${levelConfig.color}80}}
    #_ej_ban *{box-sizing:border-box}
    #_ej_ban a:hover{opacity:.85}
</style>

<div style="
    max-width:560px;width:100%;
    background:linear-gradient(160deg,rgba(25,4,10,.98) 0%,rgba(12,4,20,.98) 100%);
    border:3px solid ${levelConfig.color}70;border-radius:32px;
    padding:40px 32px 32px;text-align:center;
    box-shadow:0 0 100px ${levelConfig.color}40,0 0 200px rgba(139,0,0,.2),inset 0 2px 0 rgba(255,255,255,.08);
    position:relative;overflow:hidden;
    animation:_bfade .6s ease both, _bglow 3s ease-in-out infinite;">

    <!-- Animated background -->
    <div style="position:absolute;inset:0;border-radius:32px;
        background:${levelConfig.color}08;animation:_bpulse 2.5s ease-in-out infinite;pointer-events:none;"></div>

    <!-- Spinning rings -->
    <div style="position:absolute;top:-80px;right:-80px;width:220px;height:220px;border-radius:50%;
        border:3px solid ${levelConfig.color}15;animation:_bspin 20s linear infinite;pointer-events:none;"></div>
    <div style="position:absolute;bottom:-60px;left:-60px;width:160px;height:160px;border-radius:50%;
        border:3px solid ${levelConfig.color}12;animation:_bspin 15s linear infinite reverse;pointer-events:none;"></div>

    <!-- Level indicator -->
    <div style="display:inline-flex;align-items:center;justify-content:center;gap:8px;
        background:${levelConfig.color}20;border:2px solid ${levelConfig.color}60;
        border-radius:50px;padding:8px 20px;margin-bottom:16px;
        box-shadow:0 0 20px ${levelConfig.color}30;">
        <span style="font-size:28px;">${levelConfig.icon}</span>
        <div style="text-align:right;">
            <p style="font-size:11px;font-weight:900;color:${levelConfig.color};margin:0;line-height:1.2;">
                ${levelConfig.name}
            </p>
            <p style="font-size:9px;color:${levelConfig.color}90;margin:0;line-height:1;">
                ${levelConfig.severity}
            </p>
        </div>
    </div>

    <!-- Main icon -->
    <div style="font-size:90px;margin-bottom:12px;line-height:1;
        filter:drop-shadow(0 0 30px ${levelConfig.color});">🚫</div>

    <!-- Title -->
    <h1 style="font-family:'Orbitron',sans-serif;font-size:clamp(20px,5.5vw,30px);
        font-weight:900;color:#ef4444;margin:0 0 6px;
        text-shadow:0 0 30px rgba(239,68,68,.9);">تم حظر حسابك</h1>
    <p style="font-family:'Orbitron',sans-serif;font-size:11px;color:rgba(239,68,68,.6);
        letter-spacing:.3em;text-transform:uppercase;margin:0 0 28px;">ACCOUNT BANNED</p>

    <!-- Category badge -->
    <div style="display:inline-flex;align-items:center;gap:10px;
        background:${cat.color}20;border:2px solid ${cat.color}60;
        border-radius:35px;padding:8px 20px;margin-bottom:24px;">
        <span style="font-size:22px;">${cat.icon}</span>
        <span style="font-size:14px;font-weight:900;color:${cat.color};">${cat.ar}</span>
    </div>

    <!-- Reason -->
    <div style="background:rgba(239,68,68,.09);border:2px solid rgba(239,68,68,.25);
        border-radius:18px;padding:18px 20px;margin-bottom:20px;">
        <p style="font-size:11px;color:rgba(255,255,255,.35);font-family:'Orbitron',sans-serif;
            letter-spacing:.18em;margin:0 0 8px;">سبب الحظر</p>
        <p style="font-size:16px;font-weight:900;color:#fff;margin:0;line-height:1.6;">
            ${ban.reason}
        </p>
    </div>

    <!-- Time grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
        <div style="background:rgba(255,255,255,.05);border:2px solid rgba(255,255,255,.1);
            border-radius:14px;padding:14px 12px;">
            <p style="font-size:10px;color:rgba(255,255,255,.35);font-family:'Orbitron',sans-serif;
                letter-spacing:.15em;margin:0 0 6px;">تاريخ الحظر</p>
            <p style="font-size:13px;font-weight:700;color:rgba(255,255,255,.8);margin:0;line-height:1.4;">
                ${fmtDate(ban.bannedAt)}
            </p>
        </div>

        <div style="background:rgba(255,255,255,.05);border:2px solid rgba(255,255,255,.1);
            border-radius:14px;padding:14px 12px;">
            <p style="font-size:10px;color:rgba(255,255,255,.35);font-family:'Orbitron',sans-serif;
                letter-spacing:.15em;margin:0 0 6px;">ينتهي في</p>
            <p style="font-size:13px;font-weight:700;color:${isPerm ? '#ef4444' : 'rgba(255,255,255,.8)'};margin:0;line-height:1.4;">
                ${isPerm ? '♾️ دائم' : fmtDate(ban.expiresAt)}
            </p>
        </div>

        <div style="background:rgba(255,255,255,.05);border:2px solid rgba(255,255,255,.1);
            border-radius:14px;padding:14px 12px;">
            <p style="font-size:10px;color:rgba(255,255,255,.35);font-family:'Orbitron',sans-serif;
                letter-spacing:.15em;margin:0 0 6px;">مدة الحظر</p>
            <p style="font-size:13px;font-weight:700;color:rgba(255,255,255,.8);margin:0;line-height:1.4;">
                ${fmtDuration(ban.durationMs)}
            </p>
        </div>

        <div style="background:rgba(255,255,255,.05);border:2px solid rgba(255,255,255,.1);
            border-radius:14px;padding:14px 12px;">
            <p style="font-size:10px;color:rgba(255,255,255,.35);font-family:'Orbitron',sans-serif;
                letter-spacing:.15em;margin:0 0 6px;">نفّذه</p>
            <p style="font-size:13px;font-weight:700;color:rgba(255,255,255,.8);margin:0;">
                ${ban.bannedBy === 'system' ? '🤖 النظام' : '👤 الإدارة'}
            </p>
        </div>
    </div>

    <!-- Live countdown -->
    ${isPerm ? `
    <div style="background:rgba(0,0,0,.5);border:3px solid rgba(239,68,68,.3);
        border-radius:20px;padding:20px;margin-bottom:24px;">
        <p style="font-size:12px;color:rgba(239,68,68,.7);font-family:'Orbitron',sans-serif;
            letter-spacing:.18em;margin:0 0 8px;">نوع الحظر</p>
        <p style="font-size:28px;font-weight:900;font-family:'Orbitron',sans-serif;
            color:#ef4444;text-shadow:0 0 20px rgba(239,68,68,.8);margin:0;">⛔ دائم</p>
    </div>
    ` : `
    <div style="background:rgba(0,0,0,.5);border:3px solid ${levelConfig.color}40;
        border-radius:20px;padding:20px;margin-bottom:24px;">
        <p style="font-size:11px;color:${levelConfig.color};font-family:'Orbitron',sans-serif;
            letter-spacing:.18em;margin:0 0 10px;">الوقت المتبقي</p>
        <div id="${remainingId}" style="font-family:'Orbitron',sans-serif;
            font-size:clamp(18px,5vw,28px);font-weight:900;color:${levelConfig.color};
            text-shadow:0 0 20px ${levelConfig.color}90;letter-spacing:.05em;">
            ${fmtRemaining(ban.expiresAt)}
        </div>
    </div>
    `}

    <!-- Ban count warning -->
    ${ban.banCount > 1 ? `
    <div style="background:rgba(239,68,68,.12);border:2px solid rgba(239,68,68,.3);
        border-radius:16px;padding:14px;margin-bottom:20px;">
        <p style="font-size:13px;color:#ef4444;font-weight:700;margin:0;line-height:1.6;">
            ⚠️ هذا حظرك رقم <strong style="font-size:18px;">${ban.banCount}</strong> من أصل ${PERM_BAN_THRESHOLD}
            ${ban.banCount >= PERM_BAN_THRESHOLD ? '<br><strong>الحظر التالي سيكون دائماً ⛔</strong>' : ''}
        </p>
    </div>` : ''}

    <!-- Note -->
    <p style="font-size:13px;color:rgba(255,255,255,.35);line-height:1.9;margin:0 0 24px;">
        لا يمكنك اللعب خلال فترة الحظر.<br>
        للاستئناف أو الإبلاغ عن خطأ تواصل معنا.
    </p>

    <!-- Discord appeal -->
    <a href="https://discord.gg/xBQ3ewVVHk" target="_blank" rel="noopener" style="
        display:inline-flex;align-items:center;gap:10px;
        padding:14px 30px;border-radius:16px;text-decoration:none;
        background:rgba(88,101,242,.15);border:3px solid rgba(88,101,242,.4);
        color:#fff;font-weight:900;font-size:14px;font-family:'Cairo',sans-serif;
        transition:all .3s;box-shadow:0 4px 20px rgba(88,101,242,.2);">
        <svg width="20" height="20" viewBox="0 0 71 55" fill="none">
            <path d="M60.1045 4.8978C55.5792 2.8214 50.7265 1.2916 45.6527 0.41542C45.5603 0.39851 45.468 0.44077 45.4204 0.52529C44.7963 1.6353 44.105 3.0834 43.6209 4.2216C38.1637 3.4046 32.7345 3.4046 27.3892 4.2216C26.905 3.0581 26.1886 1.6353 25.5617 0.52529C25.5141 0.44359 25.4218 0.40133 25.3294 0.41542C20.2584 1.2888 15.4057 2.8186 10.8776 4.8978C10.8384 4.9147 10.8048 4.9429 10.7825 4.9795C1.57795 18.7309 -0.943561 32.1443 0.293408 45.3914C0.299005 45.4562 0.335386 45.5182 0.385761 45.5576C6.45866 50.0174 12.3413 52.7249 18.1147 54.5195C18.2071 54.5477 18.305 54.5139 18.3638 54.4377C19.7295 52.5728 20.9469 50.6063 21.9907 48.5383C22.0523 48.4172 21.9935 48.2735 21.8676 48.2256C19.9366 47.4931 18.0979 46.6 16.3292 45.5858C16.1893 45.5041 16.1781 45.304 16.3068 45.2082C16.679 44.9293 17.0513 44.6391 17.4067 44.3461C17.471 44.2926 17.5606 44.2813 17.6362 44.3151C29.2558 49.6202 41.8354 49.6202 53.3179 44.3151C53.3935 44.2785 53.4831 44.2898 53.5502 44.3433C53.9057 44.6363 54.2779 44.9293 54.6529 45.2082C54.7816 45.304 54.7732 45.5041 54.6333 45.5858C52.8646 46.6197 51.0259 47.4931 49.0921 48.2228C48.9662 48.2707 48.9102 48.4172 48.9718 48.5383C50.038 50.6034 51.2554 52.5699 52.5959 54.4349C52.6519 54.5139 52.7526 54.5477 52.845 54.5195C58.6464 52.7249 64.529 50.0174 70.6019 45.5576C70.6551 45.5182 70.6887 45.459 70.6943 45.3942C72.1747 30.0791 68.2147 16.7757 60.1968 4.9823C60.1772 4.9429 60.1437 4.9147 60.1045 4.8978Z" fill="#5865F2"/>
        </svg>
        استأنف الحظر
    </a>
</div>`;

    document.body.appendChild(overlay);
    _screenShown = true;

    // Live countdown
    if (!isPerm) {
        const el = document.getElementById(remainingId);
        if (el) {
            const tick = () => {
                const rem = ban.expiresAt - Date.now();
                if (rem <= 0) {
                    el.textContent = '⏳ انتهى — جارٍ التحقق...';
                    fetchActiveBan().then(b => {
                        if (!b) {
                            removeBanScreen();
                            location.reload();
                        } else {
                            showBanScreen(b);
                        }
                    });
                    return;
                }
                const d = Math.floor(rem / 864e5);
                const h = Math.floor((rem % 864e5) / 36e5);
                const m = Math.floor((rem % 36e5) / 6e4);
                const s = Math.floor((rem % 6e4) / 1e3);
                el.textContent = d > 0
                    ? `${d}ي ${h}س ${m}د ${s}ث`
                    : `${h}س ${m}د ${s}ث`;
                setTimeout(tick, 1000);
            };
            tick();
        }
    }
}

function removeBanScreen() {
    document.getElementById('_ej_ban')?.remove();
    _screenShown = false;
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.pointerEvents = '';
    _navLocked = false;
}

// ══════════════════════════════════════════════════════════
// WARNING TOAST
// ══════════════════════════════════════════════════════════
function showWarningToast(level, warningNum, maxWarnings) {
    document.querySelectorAll('._ej_warn').forEach(e => e.remove());

    const levelConfig = LEVELS[level];
    const isLastWarning = warningNum >= maxWarnings - 1;

    const toast = document.createElement('div');
    toast.className = '_ej_warn';
    toast.style.cssText = `
        position:fixed;top:24px;left:50%;transform:translateX(-50%) translateY(-24px);
        z-index:2147483646;font-family:'Cairo',sans-serif;text-align:center;
        background:${isLastWarning
            ? 'linear-gradient(135deg,rgba(239,68,68,.25),rgba(180,0,0,.2))'
            : `linear-gradient(135deg,${levelConfig.color}30,${levelConfig.color}20)`};
        border:3px solid ${isLastWarning ? 'rgba(239,68,68,.7)' : `${levelConfig.color}80`};
        border-radius:24px;padding:16px 26px;
        box-shadow:0 10px 50px rgba(0,0,0,.6);backdrop-filter:blur(20px);
        min-width:300px;max-width:90vw;
        transition:transform .4s cubic-bezier(.34,1.56,.64,1),opacity .4s;`;

    toast.innerHTML = `
        <div style="font-size:36px;margin-bottom:8px;line-height:1;">${levelConfig.icon}</div>
        <p style="font-size:17px;font-weight:900;
            color:${isLastWarning ? '#ef4444' : levelConfig.color};margin:0 0 6px;">
            ${isLastWarning ? '🚨 آخر تحذير!' : `${levelConfig.name}`}
        </p>
        <p style="font-size:13px;color:rgba(255,255,255,.7);margin:0;line-height:1.7;">
            رسالتك تحتوي على محتوى محظور وتم حذفها<br>
            ${isLastWarning
                ? '<strong style="color:#ef4444;">المخالفة التالية ستؤدي للحظر فوراً</strong>'
                : `تحذير ${warningNum} من ${maxWarnings}`
            }
        </p>`;

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(-50%) translateY(-24px)';
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}

// ══════════════════════════════════════════════════════════
// REAL-TIME LISTENER
// ══════════════════════════════════════════════════════════
function startRealtimeListener() {
    if (!_user) return;
    const f = fbFns();
    if (!f?.onValue || !_db) return;

    if (_unsubBan) { try { _unsubBan(); } catch {} }

    const banRef = f.ref(_db, `players/${_user.uid}/ban`);
    _unsubBan = f.onValue(banRef, (snap) => {
        const ban = snap?.val?.() ?? snap?.exists?.() ? snap.val() : null;

        if (!ban) {
            if (_screenShown) {
                lsBan(null);
                removeBanScreen();
                location.reload();
            }
            return;
        }

        if (!ban.isPermanent && ban.expiresAt !== -1 && Date.now() >= ban.expiresAt) {
            liftBan();
            return;
        }

        lsBan(ban);
        showBanScreen(ban);
    });
}

// ══════════════════════════════════════════════════════════
// PERIODIC RE-CHECK
// ══════════════════════════════════════════════════════════
function startPeriodicCheck() {
    if (_recheckTimer) clearInterval(_recheckTimer);
    _recheckTimer = setInterval(async () => {
        const ban = await fetchActiveBan();
        if (ban && !_screenShown) {
            showBanScreen(ban);
        } else if (!ban && _screenShown) {
            removeBanScreen();
        }
    }, RECHECK_INTERVAL_MS);
}

// ══════════════════════════════════════════════════════════
// OFFENSE HISTORY
// ══════════════════════════════════════════════════════════
async function fetchOffenseHistory() {
    let currentWarnings = 0;
    let previousBans = 0;

    if (_user) {
        const playerData = await dbGet(`players/${_user.uid}`);
        currentWarnings = playerData?.moderationWarnings ?? 0;
        previousBans = playerData?.totalBans ?? 0;
    } else {
        currentWarnings = lsWarnings();
        const localBan = lsGetBan();
        if (localBan) previousBans = 1;
    }

    return { currentWarnings, previousBans };
}

// ══════════════════════════════════════════════════════════
// PUBLIC API
// ══════════════════════════════════════════════════════════

async function init(db, user) {
    _db = db;
    _user = user;

    const ban = await fetchActiveBan();
    if (ban) {
        showBanScreen(ban);
    }

    startRealtimeListener();
    startPeriodicCheck();
}

async function scan(text) {
    const violation = detectViolation(text);
    
    if (!violation) return false; // Clean message

    const level = violation.level;
    const levelConfig = LEVELS[level];
    const { currentWarnings, previousBans } = await fetchOffenseHistory();

    // Level 5: Instant permanent ban
    if (level === 5) {
        await new Promise(r => setTimeout(r, 800));
        await issueBan(
            `${violation.description}: ${violation.word}`,
            violation.category,
            5,
            'system'
        );
        return true;
    }

    // If user has previous bans: reduce tolerance
    const adjustedThreshold = previousBans > 0 
        ? Math.max(1, Math.floor(levelConfig.warningsThreshold / 2))
        : levelConfig.warningsThreshold;

    // Check if should ban now
    if (currentWarnings >= adjustedThreshold) {
        showWarningToast(level, currentWarnings, adjustedThreshold);
        await new Promise(r => setTimeout(r, 800));
        await issueBan(
            `${violation.description} (${currentWarnings} تحذيرات)`,
            violation.category,
            level,
            'system'
        );
        return true;
    }

    // Issue warning
    const newWarnings = await addWarning();
    const isLast = newWarnings >= adjustedThreshold - 1;
    showWarningToast(level, newWarnings, adjustedThreshold);

    return true; // Message blocked
}

// Admin functions
async function banUserManual(targetUid, reason, category, level) {
    const levelConfig = LEVELS[level] || LEVELS[3];
    const ban = {
        reason: reason || 'قرار إداري',
        category: category || 'admin_decision',
        level,
        bannedAt: Date.now(),
        expiresAt: levelConfig.banDuration === -1 ? -1 : Date.now() + levelConfig.banDuration,
        durationMs: levelConfig.banDuration,
        bannedBy: _user?.uid || 'admin',
        isPermanent: levelConfig.banDuration === -1,
        banCount: 1,
    };
    
    if (_db) {
        const f = fbFns();
        if (f) {
            await f.update(f.ref(_db, `players/${targetUid}`), { ban });
            await f.set(f.ref(_db, `banned_users/${targetUid}`), ban);
        }
    }
}

async function liftBanManual(targetUid) {
    if (!_db) return;
    const f = fbFns();
    if (!f) return;
    await f.update(f.ref(_db, `players/${targetUid}`), { ban: null, moderationWarnings: 0 });
    await f.set(f.ref(_db, `banned_users/${targetUid}`), null);
    if (_user && targetUid === _user.uid) {
        lsBan(null);
        lsSetWarn(0);
        removeBanScreen();
    }
}

// Export
window.MOD = {
    init,
    scan,
    banUserManual,
    liftBanManual,
    detectViolation,
    showBanScreen,
    CATEGORIES,
    LEVELS,
};

// Legacy support
window.moderateMessage = async (text) => {
    const blocked = await scan(text);
    return { allowed: !blocked, message: blocked ? 'رسالتك تحتوي على محتوى محظور' : null };
};

})();