/* Plainly i18n: hand-written templates for safety-critical wording (schedules, routes, forms,
 * urgency, headings, safety-check titles). Doses and numbers are inserted as numerals, never
 * machine-translated. Free text elsewhere goes through on-device machine translation (translate.js).
 * NOTE: translations were written by the team and should be reviewed by native-speaking clinicians
 * before clinical use.
 */
(function () {
  "use strict";

  const LANGS = [
    // name, native, BCP-47, speech code, rtl, MedlinePlus language ("en"/"es"), opus-mt model
    { id: "en", name: "English", native: "English", speech: "en-US", rtl: false, mp: "en", mt: null },
    { id: "es", name: "Spanish", native: "Español", speech: "es-ES", rtl: false, mp: "es", mt: "Xenova/opus-mt-en-es", q: "good" },
    { id: "zh", name: "Chinese (Simplified)", native: "中文", speech: "zh-CN", rtl: false, mp: "en", mt: "Xenova/opus-mt-en-zh", q: "fair" },
    { id: "vi", name: "Vietnamese", native: "Tiếng Việt", speech: "vi-VN", rtl: false, mp: "en", mt: "Xenova/opus-mt-en-vi", q: "basic" },
    { id: "ar", name: "Arabic", native: "العربية", speech: "ar-SA", rtl: true, mp: "en", mt: "Xenova/opus-mt-en-ar", q: "basic" },
    { id: "hi", name: "Hindi", native: "हिन्दी", speech: "hi-IN", rtl: false, mp: "en", mt: "Xenova/opus-mt-en-hi", q: "basic" },
    { id: "fr", name: "French", native: "Français", speech: "fr-FR", rtl: false, mp: "en", mt: "Xenova/opus-mt-en-fr", q: "good" },
    { id: "ru", name: "Russian", native: "Русский", speech: "ru-RU", rtl: false, mp: "en", mt: "Xenova/opus-mt-en-ru", q: "fair" },
    // Machine translation only (UI templates fall back to machine translation too)
    { id: "uk", name: "Ukrainian", native: "Українська", speech: "uk-UA", rtl: false, mp: "en", mt: "Xenova/opus-mt-en-uk", q: "fair", partial: true },
    { id: "de", name: "German", native: "Deutsch", speech: "de-DE", rtl: false, mp: "en", mt: "Xenova/opus-mt-en-de", q: "good", partial: true },
    // Browser built-in translator only (Chrome on-device Translator API), when available
    { id: "ko", name: "Korean", native: "한국어", speech: "ko-KR", rtl: false, mp: "en", mt: null, partial: true, browserOnly: true },
    { id: "pt", name: "Portuguese", native: "Português", speech: "pt-BR", rtl: false, mp: "en", mt: null, partial: true, browserOnly: true },
    { id: "ja", name: "Japanese", native: "日本語", speech: "ja-JP", rtl: false, mp: "en", mt: null, partial: true, browserOnly: true },
  ];

  const S = {};
  S.en = {
    summary: "Summary", warnings: "Warning signs", emergency: "Emergency", call_doctor: "Call your doctor",
    callout: "If you think it is an emergency, call your local emergency number now (911 in the U.S.).",
    meds: "Your medicines", morning: "Morning", midday: "Midday", evening: "Evening", bedtime: "Bedtime", as_needed: "Only if needed",
    results: "Your test results", test: "Test", result: "Result", range: "Normal range", high: "High", low: "Low", normal: "Normal", unknown: "Unknown", critical: "Far outside normal",
    next: "Next steps", key: "Other instructions", gloss: "Words explained", questions: "Questions to ask your care team", unclear: "Check these with your care team",
    listen: "Listen", why: "What it's for", careful: "Be careful", st_new: "NEW", st_changed: "CHANGED", st_continue: "Keep taking", st_stop: "STOP taking",
    allergies: "Allergies", safety: "Medicine safety check", pending: "Results not back yet", due: "Due", cat_diet: "Food and drink", cat_activity: "Activity",
    cat_wound: "Wound care", cat_monitor: "Check at home", cat_other: "Other", more_info: "Learn more (MedlinePlus)",
    how: "How", when: "When", for_days: "for {n} days", for_weeks: "for {n} weeks", with_food: "with food", empty_stomach: "on an empty stomach",
    max_per_day: "No more than {n} doses in 24 hours", daily_total: "Up to {mg} mg a day", ask_pharmacist: "Ask your pharmacist or doctor before your next dose.",
    f_1: "once a day", f_2: "2 times a day", f_3: "3 times a day", f_4: "4 times a day", f_qh: "every {n} hours", f_qhr: "every {a} to {b} hours",
    f_qod: "every other day", f_weekly: "once a WEEK", f_bedtime: "at bedtime", f_morning: "every morning", f_evening: "every evening", f_meals: "with meals",
    r_oral: "by mouth", r_sl: "under the tongue", r_inhaled: "breathe in (inhaler)", r_subcut: "inject under the skin", r_im: "injection into a muscle", r_iv: "into a vein (IV)",
    r_topical: "on the skin", r_eye_both: "in both eyes", r_eye_right: "in the right eye", r_eye_left: "in the left eye", r_ear: "in the ear", r_nasal: "in the nose", r_rectal: "in the rectum", r_patch: "patch on the skin",
    forms: { tablet: ["tablet", "tablets"], capsule: ["capsule", "capsules"], puff: ["puff", "puffs"], drop: ["drop", "drops"], unit: ["unit", "units"], mL: ["mL", "mL"], patch: ["patch", "patches"], spray: ["spray", "sprays"], dose: ["dose", "doses"], suppository: ["suppository", "suppositories"] },
    t_discharge: "Your hospital discharge instructions", t_lab_results: "Your lab results", t_prescription: "Your prescription", t_visit_summary: "Your visit summary", t_other: "Your medical document",
    sum_meds: "{n} medicines", sum_stop: "{n} to STOP", sum_warn: "{n} warning signs", sum_next: "{n} next steps", sum_labs: "{n} test results ({a} outside the normal range)", sum_intro: "This document lists:",
    lv_danger: "Important", lv_caution: "Check", lv_info: "Good to know",
    ck_apap_over: "Too much acetaminophen (Tylenol) in a day", ck_apap_max: "At the daily limit for acetaminophen (Tylenol)", ck_apap_dup: "Acetaminophen (Tylenol) is in more than one medicine", ck_dup: "The same medicine is listed twice",
    ck_two_nsaid: "Two anti-inflammatory pain medicines (NSAIDs)", ck_bleed: "Higher bleeding risk", ck_two_anticoag: "Two blood thinners", ck_opioid_sedative: "Two medicines that cause sleepiness and slow breathing",
    ck_triple: "Kidney strain from this combination", ck_potassium: "Medicines that raise potassium", ck_allergy: "Possible allergy conflict", ck_avoid_conflict: "Your document says to avoid a medicine on your list",
    ck_mtx: "Methotrexate written as a daily medicine", ck_max_dose: "More than the usual daily maximum", ck_stop_and_take: "Listed to STOP and to take", ck_ismp: "Error-prone abbreviation",
    ck_critical: "Test result far outside normal", ck_no_freq: "How often to take it is unclear", ck_opioid_constipation: "Opioids cause constipation", ck_unknown_drug: "Medicine name not recognized",
    mt_badge: "machine-translated", show_en: "Show English", num_fail: "The translation changed a number, so the English is shown.",
    card_title: "My medicine card", interp: "Free interpreter: in the U.S., hospitals and clinics that receive federal funding must give you a medical interpreter at no cost. Ask for one.", card_note: "Bring this card to every appointment, pharmacy visit and emergency room.",
  };

  S.es = {
    summary: "Resumen", warnings: "Señales de alarma", emergency: "Emergencia", call_doctor: "Llame a su médico",
    callout: "Si cree que es una emergencia, llame ahora a su número local de emergencias (911 en EE. UU.).",
    meds: "Sus medicamentos", morning: "Mañana", midday: "Mediodía", evening: "Tarde", bedtime: "Al acostarse", as_needed: "Solo si lo necesita",
    results: "Sus resultados", test: "Prueba", result: "Resultado", range: "Rango normal", high: "Alto", low: "Bajo", normal: "Normal", unknown: "Desconocido", critical: "Muy fuera de lo normal",
    next: "Próximos pasos", key: "Otras instrucciones", gloss: "Palabras explicadas", questions: "Preguntas para su equipo médico", unclear: "Confirme esto con su equipo médico",
    listen: "Escuchar", why: "Para qué sirve", careful: "Tenga cuidado", st_new: "NUEVO", st_changed: "CAMBIÓ", st_continue: "Siga tomando", st_stop: "DEJE de tomar",
    allergies: "Alergias", safety: "Revisión de seguridad de medicamentos", pending: "Resultados pendientes", due: "Fecha", cat_diet: "Comida y bebida", cat_activity: "Actividad",
    cat_wound: "Cuidado de la herida", cat_monitor: "Controle en casa", cat_other: "Otro", more_info: "Más información (MedlinePlus)",
    how: "Cómo", when: "Cuándo", for_days: "durante {n} días", for_weeks: "durante {n} semanas", with_food: "con comida", empty_stomach: "en ayunas",
    max_per_day: "No más de {n} dosis en 24 horas", daily_total: "Hasta {mg} mg al día", ask_pharmacist: "Pregunte a su farmacéutico o médico antes de la próxima dosis.",
    f_1: "una vez al día", f_2: "2 veces al día", f_3: "3 veces al día", f_4: "4 veces al día", f_qh: "cada {n} horas", f_qhr: "cada {a} a {b} horas",
    f_qod: "un día sí y otro no", f_weekly: "una vez a la SEMANA", f_bedtime: "al acostarse", f_morning: "cada mañana", f_evening: "cada tarde", f_meals: "con las comidas",
    r_oral: "por la boca", r_sl: "debajo de la lengua", r_inhaled: "inhalado (inhalador)", r_subcut: "inyección debajo de la piel", r_im: "inyección en el músculo", r_iv: "en la vena (IV)",
    r_topical: "sobre la piel", r_eye_both: "en ambos ojos", r_eye_right: "en el ojo derecho", r_eye_left: "en el ojo izquierdo", r_ear: "en el oído", r_nasal: "en la nariz", r_rectal: "por el recto", r_patch: "parche sobre la piel",
    forms: { tablet: ["tableta", "tabletas"], capsule: ["cápsula", "cápsulas"], puff: ["inhalación", "inhalaciones"], drop: ["gota", "gotas"], unit: ["unidad", "unidades"], mL: ["mL", "mL"], patch: ["parche", "parches"], spray: ["pulverización", "pulverizaciones"], dose: ["dosis", "dosis"], suppository: ["supositorio", "supositorios"] },
    t_discharge: "Sus instrucciones de alta del hospital", t_lab_results: "Sus resultados de laboratorio", t_prescription: "Su receta", t_visit_summary: "Resumen de su consulta", t_other: "Su documento médico",
    sum_meds: "{n} medicamentos", sum_stop: "{n} que debe DEJAR", sum_warn: "{n} señales de alarma", sum_next: "{n} próximos pasos", sum_labs: "{n} resultados ({a} fuera del rango normal)", sum_intro: "Este documento incluye:",
    lv_danger: "Importante", lv_caution: "Revisar", lv_info: "Para saber",
    ck_apap_over: "Demasiado acetaminofén (Tylenol) en un día", ck_apap_max: "En el límite diario de acetaminofén (Tylenol)", ck_apap_dup: "El acetaminofén (Tylenol) está en más de un medicamento", ck_dup: "El mismo medicamento aparece dos veces",
    ck_two_nsaid: "Dos analgésicos antiinflamatorios (AINE)", ck_bleed: "Mayor riesgo de sangrado", ck_two_anticoag: "Dos anticoagulantes", ck_opioid_sedative: "Dos medicamentos que causan sueño y respiración lenta",
    ck_triple: "Esta combinación puede dañar los riñones", ck_potassium: "Medicamentos que suben el potasio", ck_allergy: "Posible conflicto con una alergia", ck_avoid_conflict: "Su documento dice que evite un medicamento de su lista",
    ck_mtx: "Metotrexato indicado como medicamento diario", ck_max_dose: "Más del máximo diario habitual", ck_stop_and_take: "Indicado para DEJAR y para tomar", ck_ismp: "Abreviatura propensa a errores",
    ck_critical: "Resultado muy fuera de lo normal", ck_no_freq: "No está claro cada cuánto tomarlo", ck_opioid_constipation: "Los opioides causan estreñimiento", ck_unknown_drug: "Nombre de medicamento no reconocido",
    mt_badge: "traducción automática", show_en: "Ver en inglés", num_fail: "La traducción cambió un número, por eso se muestra en inglés.",
    card_title: "Mi tarjeta de medicamentos", interp: "Intérprete gratuito: en EE. UU., los hospitales y clínicas que reciben fondos federales deben darle un intérprete médico sin costo. Pídalo.", card_note: "Lleve esta tarjeta a cada cita, a la farmacia y a la sala de emergencias.",
  };

  S.fr = {
    summary: "Résumé", warnings: "Signes d'alerte", emergency: "Urgence", call_doctor: "Appelez votre médecin",
    callout: "Si vous pensez que c'est une urgence, appelez tout de suite le numéro d'urgence local (911 aux États-Unis).",
    meds: "Vos médicaments", morning: "Matin", midday: "Midi", evening: "Soir", bedtime: "Au coucher", as_needed: "Seulement si besoin",
    results: "Vos résultats d'analyses", test: "Analyse", result: "Résultat", range: "Valeurs normales", high: "Élevé", low: "Bas", normal: "Normal", unknown: "Inconnu", critical: "Très anormal",
    next: "Prochaines étapes", key: "Autres consignes", gloss: "Les mots expliqués", questions: "Questions à poser à votre équipe soignante", unclear: "À vérifier avec votre équipe soignante",
    listen: "Écouter", why: "À quoi il sert", careful: "Attention", st_new: "NOUVEAU", st_changed: "MODIFIÉ", st_continue: "Continuez", st_stop: "ARRÊTEZ",
    allergies: "Allergies", safety: "Vérification de sécurité des médicaments", pending: "Résultats en attente", due: "Date", cat_diet: "Alimentation", cat_activity: "Activité",
    cat_wound: "Soins de la plaie", cat_monitor: "À surveiller à la maison", cat_other: "Autre", more_info: "En savoir plus (MedlinePlus)",
    how: "Comment", when: "Quand", for_days: "pendant {n} jours", for_weeks: "pendant {n} semaines", with_food: "avec de la nourriture", empty_stomach: "à jeun",
    max_per_day: "Pas plus de {n} prises en 24 heures", daily_total: "Jusqu'à {mg} mg par jour", ask_pharmacist: "Demandez à votre pharmacien ou médecin avant la prochaine prise.",
    f_1: "une fois par jour", f_2: "2 fois par jour", f_3: "3 fois par jour", f_4: "4 fois par jour", f_qh: "toutes les {n} heures", f_qhr: "toutes les {a} à {b} heures",
    f_qod: "un jour sur deux", f_weekly: "une fois par SEMAINE", f_bedtime: "au coucher", f_morning: "chaque matin", f_evening: "chaque soir", f_meals: "aux repas",
    r_oral: "par la bouche", r_sl: "sous la langue", r_inhaled: "à inhaler (inhalateur)", r_subcut: "injection sous la peau", r_im: "injection dans le muscle", r_iv: "dans la veine (IV)",
    r_topical: "sur la peau", r_eye_both: "dans les deux yeux", r_eye_right: "dans l'œil droit", r_eye_left: "dans l'œil gauche", r_ear: "dans l'oreille", r_nasal: "dans le nez", r_rectal: "par voie rectale", r_patch: "patch sur la peau",
    forms: { tablet: ["comprimé", "comprimés"], capsule: ["gélule", "gélules"], puff: ["bouffée", "bouffées"], drop: ["goutte", "gouttes"], unit: ["unité", "unités"], mL: ["mL", "mL"], patch: ["patch", "patchs"], spray: ["pulvérisation", "pulvérisations"], dose: ["dose", "doses"], suppository: ["suppositoire", "suppositoires"] },
    t_discharge: "Vos consignes de sortie de l'hôpital", t_lab_results: "Vos résultats d'analyses", t_prescription: "Votre ordonnance", t_visit_summary: "Résumé de votre consultation", t_other: "Votre document médical",
    sum_meds: "{n} médicaments", sum_stop: "{n} à ARRÊTER", sum_warn: "{n} signes d'alerte", sum_next: "{n} prochaines étapes", sum_labs: "{n} résultats ({a} hors des valeurs normales)", sum_intro: "Ce document contient :",
    lv_danger: "Important", lv_caution: "À vérifier", lv_info: "Bon à savoir",
    ck_apap_over: "Trop de paracétamol (Tylenol) dans une journée", ck_apap_max: "À la limite quotidienne de paracétamol (Tylenol)", ck_apap_dup: "Le paracétamol (Tylenol) est dans plusieurs médicaments", ck_dup: "Le même médicament apparaît deux fois",
    ck_two_nsaid: "Deux anti-inflammatoires (AINS)", ck_bleed: "Risque de saignement plus élevé", ck_two_anticoag: "Deux anticoagulants", ck_opioid_sedative: "Deux médicaments qui endorment et ralentissent la respiration",
    ck_triple: "Cette association peut fatiguer les reins", ck_potassium: "Médicaments qui augmentent le potassium", ck_allergy: "Conflit possible avec une allergie", ck_avoid_conflict: "Votre document dit d'éviter un médicament de votre liste",
    ck_mtx: "Méthotrexate écrit comme un médicament quotidien", ck_max_dose: "Plus que le maximum quotidien habituel", ck_stop_and_take: "Indiqué à ARRÊTER et à prendre", ck_ismp: "Abréviation source d'erreurs",
    ck_critical: "Résultat très anormal", ck_no_freq: "La fréquence de prise n'est pas claire", ck_opioid_constipation: "Les opioïdes constipent", ck_unknown_drug: "Nom de médicament non reconnu",
    mt_badge: "traduction automatique", show_en: "Voir en anglais", num_fail: "La traduction a modifié un chiffre ; le texte anglais est affiché.",
    card_title: "Ma carte de médicaments", interp: "Interprète gratuit : aux États-Unis, les hôpitaux et cliniques qui reçoivent des fonds fédéraux doivent vous fournir un interprète médical gratuitement. Demandez-le.", card_note: "Apportez cette carte à chaque rendez-vous, à la pharmacie et aux urgences.",
  };

  S.zh = {
    summary: "摘要", warnings: "危险信号", emergency: "紧急", call_doctor: "联系您的医生",
    callout: "如果您认为是紧急情况，请立即拨打当地急救电话（美国为 911）。",
    meds: "您的药物", morning: "早上", midday: "中午", evening: "晚上", bedtime: "睡前", as_needed: "需要时才用",
    results: "您的检查结果", test: "检查项目", result: "结果", range: "正常范围", high: "偏高", low: "偏低", normal: "正常", unknown: "未知", critical: "严重异常",
    next: "下一步", key: "其他注意事项", gloss: "词语解释", questions: "可以问医护人员的问题", unclear: "请与医护人员确认",
    listen: "朗读", why: "用途", careful: "注意", st_new: "新药", st_changed: "已更改", st_continue: "继续服用", st_stop: "停止服用",
    allergies: "过敏", safety: "用药安全检查", pending: "尚未出结果", due: "日期", cat_diet: "饮食", cat_activity: "活动",
    cat_wound: "伤口护理", cat_monitor: "在家监测", cat_other: "其他", more_info: "了解更多（MedlinePlus）",
    how: "用法", when: "时间", for_days: "共 {n} 天", for_weeks: "共 {n} 周", with_food: "随餐服用", empty_stomach: "空腹服用",
    max_per_day: "24 小时内不超过 {n} 次", daily_total: "每天最多 {mg} 毫克", ask_pharmacist: "下次服药前请先询问药剂师或医生。",
    f_1: "每天 1 次", f_2: "每天 2 次", f_3: "每天 3 次", f_4: "每天 4 次", f_qh: "每 {n} 小时一次", f_qhr: "每 {a} 至 {b} 小时一次",
    f_qod: "隔天一次", f_weekly: "每周一次", f_bedtime: "睡前", f_morning: "每天早上", f_evening: "每天晚上", f_meals: "随餐",
    r_oral: "口服", r_sl: "舌下含服", r_inhaled: "吸入（吸入器）", r_subcut: "皮下注射", r_im: "肌肉注射", r_iv: "静脉注射",
    r_topical: "外用于皮肤", r_eye_both: "滴双眼", r_eye_right: "滴右眼", r_eye_left: "滴左眼", r_ear: "滴耳", r_nasal: "鼻用", r_rectal: "直肠给药", r_patch: "贴于皮肤",
    forms: { tablet: ["片", "片"], capsule: ["粒", "粒"], puff: ["喷", "喷"], drop: ["滴", "滴"], unit: ["单位", "单位"], mL: ["毫升", "毫升"], patch: ["贴", "贴"], spray: ["喷", "喷"], dose: ["剂", "剂"], suppository: ["粒栓剂", "粒栓剂"] },
    t_discharge: "您的出院医嘱", t_lab_results: "您的化验结果", t_prescription: "您的处方", t_visit_summary: "您的就诊摘要", t_other: "您的医疗文件",
    sum_meds: "{n} 种药物", sum_stop: "{n} 种需要停用", sum_warn: "{n} 个危险信号", sum_next: "{n} 个下一步", sum_labs: "{n} 项检查结果（{a} 项超出正常范围）", sum_intro: "本文件包括：",
    lv_danger: "重要", lv_caution: "请核对", lv_info: "须知",
    ck_apap_over: "一天内对乙酰氨基酚（泰诺）过量", ck_apap_max: "已达到对乙酰氨基酚（泰诺）每日上限", ck_apap_dup: "多种药物都含有对乙酰氨基酚（泰诺）", ck_dup: "同一种药物列了两次",
    ck_two_nsaid: "两种消炎止痛药（NSAID）", ck_bleed: "出血风险增加", ck_two_anticoag: "两种抗凝血药", ck_opioid_sedative: "两种会导致嗜睡和呼吸变慢的药物",
    ck_triple: "这种组合可能伤肾", ck_potassium: "会升高血钾的药物", ck_allergy: "可能与过敏冲突", ck_avoid_conflict: "文件要求避免的药物出现在您的药单上",
    ck_mtx: "甲氨蝶呤被写成每天服用", ck_max_dose: "超过通常的每日最大剂量", ck_stop_and_take: "同时被列为停用和服用", ck_ismp: "容易出错的缩写",
    ck_critical: "检查结果严重异常", ck_no_freq: "服药频率不清楚", ck_opioid_constipation: "阿片类药物会引起便秘", ck_unknown_drug: "无法识别的药名",
    mt_badge: "机器翻译", show_en: "显示英文", num_fail: "翻译改动了数字，因此显示英文原文。",
    card_title: "我的用药卡", interp: "免费口译：在美国，接受联邦资金的医院和诊所必须免费为您提供医疗口译员。请主动要求。", card_note: "每次就诊、去药房或急诊时请携带此卡。",
  };

  S.vi = {
    summary: "Tóm tắt", warnings: "Dấu hiệu cảnh báo", emergency: "Cấp cứu", call_doctor: "Gọi bác sĩ",
    callout: "Nếu bạn nghĩ đây là trường hợp khẩn cấp, hãy gọi ngay số cấp cứu địa phương (911 ở Hoa Kỳ).",
    meds: "Thuốc của bạn", morning: "Buổi sáng", midday: "Buổi trưa", evening: "Buổi tối", bedtime: "Trước khi ngủ", as_needed: "Chỉ khi cần",
    results: "Kết quả xét nghiệm", test: "Xét nghiệm", result: "Kết quả", range: "Mức bình thường", high: "Cao", low: "Thấp", normal: "Bình thường", unknown: "Không rõ", critical: "Bất thường nghiêm trọng",
    next: "Các bước tiếp theo", key: "Hướng dẫn khác", gloss: "Giải thích từ ngữ", questions: "Câu hỏi cho nhân viên y tế", unclear: "Hãy hỏi lại nhân viên y tế",
    listen: "Nghe", why: "Công dụng", careful: "Lưu ý", st_new: "MỚI", st_changed: "ĐÃ ĐỔI", st_continue: "Tiếp tục dùng", st_stop: "NGƯNG dùng",
    allergies: "Dị ứng", safety: "Kiểm tra an toàn thuốc", pending: "Kết quả chưa có", due: "Hạn", cat_diet: "Ăn uống", cat_activity: "Vận động",
    cat_wound: "Chăm sóc vết thương", cat_monitor: "Theo dõi tại nhà", cat_other: "Khác", more_info: "Tìm hiểu thêm (MedlinePlus)",
    how: "Cách dùng", when: "Khi nào", for_days: "trong {n} ngày", for_weeks: "trong {n} tuần", with_food: "uống cùng bữa ăn", empty_stomach: "uống lúc đói",
    max_per_day: "Không quá {n} liều trong 24 giờ", daily_total: "Tối đa {mg} mg mỗi ngày", ask_pharmacist: "Hãy hỏi dược sĩ hoặc bác sĩ trước liều tiếp theo.",
    f_1: "1 lần mỗi ngày", f_2: "2 lần mỗi ngày", f_3: "3 lần mỗi ngày", f_4: "4 lần mỗi ngày", f_qh: "mỗi {n} giờ", f_qhr: "mỗi {a} đến {b} giờ",
    f_qod: "cách ngày", f_weekly: "1 lần mỗi TUẦN", f_bedtime: "trước khi ngủ", f_morning: "mỗi buổi sáng", f_evening: "mỗi buổi tối", f_meals: "cùng bữa ăn",
    r_oral: "uống", r_sl: "ngậm dưới lưỡi", r_inhaled: "hít (bình xịt)", r_subcut: "tiêm dưới da", r_im: "tiêm bắp", r_iv: "truyền tĩnh mạch",
    r_topical: "bôi ngoài da", r_eye_both: "nhỏ cả hai mắt", r_eye_right: "nhỏ mắt phải", r_eye_left: "nhỏ mắt trái", r_ear: "nhỏ tai", r_nasal: "xịt mũi", r_rectal: "đặt hậu môn", r_patch: "dán lên da",
    forms: { tablet: ["viên", "viên"], capsule: ["viên nang", "viên nang"], puff: ["nhát xịt", "nhát xịt"], drop: ["giọt", "giọt"], unit: ["đơn vị", "đơn vị"], mL: ["mL", "mL"], patch: ["miếng dán", "miếng dán"], spray: ["lần xịt", "lần xịt"], dose: ["liều", "liều"], suppository: ["viên đặt", "viên đặt"] },
    t_discharge: "Hướng dẫn xuất viện của bạn", t_lab_results: "Kết quả xét nghiệm của bạn", t_prescription: "Đơn thuốc của bạn", t_visit_summary: "Tóm tắt lần khám", t_other: "Giấy tờ y tế của bạn",
    sum_meds: "{n} loại thuốc", sum_stop: "{n} loại cần NGƯNG", sum_warn: "{n} dấu hiệu cảnh báo", sum_next: "{n} bước tiếp theo", sum_labs: "{n} kết quả ({a} ngoài mức bình thường)", sum_intro: "Giấy này gồm:",
    lv_danger: "Quan trọng", lv_caution: "Kiểm tra", lv_info: "Nên biết",
    ck_apap_over: "Quá nhiều acetaminophen (Tylenol) trong một ngày", ck_apap_max: "Đã đến giới hạn acetaminophen (Tylenol) mỗi ngày", ck_apap_dup: "Acetaminophen (Tylenol) có trong nhiều loại thuốc", ck_dup: "Một thuốc được ghi hai lần",
    ck_two_nsaid: "Hai thuốc giảm đau chống viêm (NSAID)", ck_bleed: "Nguy cơ chảy máu cao hơn", ck_two_anticoag: "Hai thuốc chống đông máu", ck_opioid_sedative: "Hai thuốc gây buồn ngủ và làm thở chậm",
    ck_triple: "Kết hợp này có thể hại thận", ck_potassium: "Các thuốc làm tăng kali", ck_allergy: "Có thể xung đột với dị ứng", ck_avoid_conflict: "Giấy ghi tránh một thuốc có trong danh sách của bạn",
    ck_mtx: "Methotrexate được ghi dùng hằng ngày", ck_max_dose: "Vượt liều tối đa thông thường mỗi ngày", ck_stop_and_take: "Vừa ghi NGƯNG vừa ghi dùng", ck_ismp: "Chữ viết tắt dễ gây nhầm",
    ck_critical: "Kết quả bất thường nghiêm trọng", ck_no_freq: "Không rõ uống bao lâu một lần", ck_opioid_constipation: "Thuốc opioid gây táo bón", ck_unknown_drug: "Không nhận ra tên thuốc",
    mt_badge: "dịch máy", show_en: "Xem tiếng Anh", num_fail: "Bản dịch đã đổi một con số nên hiển thị tiếng Anh.",
    card_title: "Thẻ thuốc của tôi", interp: "Thông dịch viên miễn phí: tại Hoa Kỳ, bệnh viện và phòng khám nhận tiền liên bang phải cung cấp thông dịch viên y tế miễn phí cho bạn. Hãy yêu cầu.", card_note: "Mang thẻ này khi đi khám, ra nhà thuốc và vào phòng cấp cứu.",
  };

  S.ar = {
    summary: "الملخص", warnings: "علامات التحذير", emergency: "طوارئ", call_doctor: "اتصل بطبيبك",
    callout: "إذا كنت تعتقد أنها حالة طارئة، اتصل الآن برقم الطوارئ المحلي (911 في الولايات المتحدة).",
    meds: "أدويتك", morning: "الصباح", midday: "الظهر", evening: "المساء", bedtime: "قبل النوم", as_needed: "عند الحاجة فقط",
    results: "نتائج فحوصاتك", test: "الفحص", result: "النتيجة", range: "المعدل الطبيعي", high: "مرتفع", low: "منخفض", normal: "طبيعي", unknown: "غير معروف", critical: "بعيد جدًا عن الطبيعي",
    next: "الخطوات التالية", key: "تعليمات أخرى", gloss: "شرح الكلمات", questions: "أسئلة لفريق الرعاية", unclear: "تأكد من هذه مع فريق الرعاية",
    listen: "استمع", why: "الغرض منه", careful: "انتبه", st_new: "جديد", st_changed: "تغيّر", st_continue: "استمر في تناوله", st_stop: "توقف عن تناوله",
    allergies: "الحساسية", safety: "فحص سلامة الأدوية", pending: "نتائج لم تصدر بعد", due: "الموعد", cat_diet: "الطعام والشراب", cat_activity: "النشاط",
    cat_wound: "العناية بالجرح", cat_monitor: "راقب في المنزل", cat_other: "أخرى", more_info: "اعرف المزيد (MedlinePlus)",
    how: "الطريقة", when: "متى", for_days: "لمدة {n} أيام", for_weeks: "لمدة {n} أسابيع", with_food: "مع الطعام", empty_stomach: "على معدة فارغة",
    max_per_day: "لا تتجاوز {n} جرعات في 24 ساعة", daily_total: "حتى {mg} ملغ في اليوم", ask_pharmacist: "اسأل الصيدلي أو الطبيب قبل الجرعة التالية.",
    f_1: "مرة واحدة يوميًا", f_2: "مرتين يوميًا", f_3: "3 مرات يوميًا", f_4: "4 مرات يوميًا", f_qh: "كل {n} ساعات", f_qhr: "كل {a} إلى {b} ساعات",
    f_qod: "يومًا بعد يوم", f_weekly: "مرة واحدة في الأسبوع", f_bedtime: "قبل النوم", f_morning: "كل صباح", f_evening: "كل مساء", f_meals: "مع الوجبات",
    r_oral: "عن طريق الفم", r_sl: "تحت اللسان", r_inhaled: "استنشاق (بخاخ)", r_subcut: "حقنة تحت الجلد", r_im: "حقنة في العضل", r_iv: "في الوريد",
    r_topical: "على الجلد", r_eye_both: "في كلتا العينين", r_eye_right: "في العين اليمنى", r_eye_left: "في العين اليسرى", r_ear: "في الأذن", r_nasal: "في الأنف", r_rectal: "عن طريق الشرج", r_patch: "لصقة على الجلد",
    forms: { tablet: ["قرص", "أقراص"], capsule: ["كبسولة", "كبسولات"], puff: ["بخة", "بخات"], drop: ["قطرة", "قطرات"], unit: ["وحدة", "وحدات"], mL: ["مل", "مل"], patch: ["لصقة", "لصقات"], spray: ["بخة", "بخات"], dose: ["جرعة", "جرعات"], suppository: ["تحميلة", "تحاميل"] },
    t_discharge: "تعليمات خروجك من المستشفى", t_lab_results: "نتائج تحاليلك", t_prescription: "وصفتك الطبية", t_visit_summary: "ملخص زيارتك", t_other: "مستندك الطبي",
    sum_meds: "{n} أدوية", sum_stop: "{n} يجب إيقافها", sum_warn: "{n} علامات تحذير", sum_next: "{n} خطوات تالية", sum_labs: "{n} نتائج ({a} خارج المعدل الطبيعي)", sum_intro: "يتضمن هذا المستند:",
    lv_danger: "مهم", lv_caution: "تحقق", lv_info: "معلومة مفيدة",
    ck_apap_over: "كمية زائدة من الأسيتامينوفين (تايلينول) في اليوم", ck_apap_max: "عند الحد اليومي للأسيتامينوفين (تايلينول)", ck_apap_dup: "الأسيتامينوفين (تايلينول) موجود في أكثر من دواء", ck_dup: "الدواء نفسه مذكور مرتين",
    ck_two_nsaid: "مسكنان مضادان للالتهاب (NSAID)", ck_bleed: "خطر نزيف أعلى", ck_two_anticoag: "دواءان مسيلان للدم", ck_opioid_sedative: "دواءان يسببان النعاس وبطء التنفس",
    ck_triple: "هذا المزيج قد يجهد الكلى", ck_potassium: "أدوية ترفع البوتاسيوم", ck_allergy: "تعارض محتمل مع حساسية", ck_avoid_conflict: "المستند يطلب تجنب دواء موجود في قائمتك",
    ck_mtx: "الميثوتريكسات مكتوب كدواء يومي", ck_max_dose: "أكثر من الحد الأقصى اليومي المعتاد", ck_stop_and_take: "مذكور للإيقاف وللتناول", ck_ismp: "اختصار قد يسبب الأخطاء",
    ck_critical: "نتيجة بعيدة جدًا عن الطبيعي", ck_no_freq: "عدد مرات تناوله غير واضح", ck_opioid_constipation: "المواد الأفيونية تسبب الإمساك", ck_unknown_drug: "اسم دواء غير معروف",
    mt_badge: "ترجمة آلية", show_en: "عرض الإنجليزية", num_fail: "غيّرت الترجمة رقمًا، لذلك يُعرض النص الإنجليزي.",
    card_title: "بطاقة أدويتي", interp: "مترجم مجاني: في الولايات المتحدة، يجب على المستشفيات والعيادات التي تتلقى تمويلًا فيدراليًا أن توفر لك مترجمًا طبيًا مجانًا. اطلبه.", card_note: "أحضر هذه البطاقة إلى كل موعد وإلى الصيدلية وغرفة الطوارئ.",
  };

  S.hi = {
    summary: "सारांश", warnings: "चेतावनी के संकेत", emergency: "आपातकाल", call_doctor: "अपने डॉक्टर को फ़ोन करें",
    callout: "अगर आपको लगता है कि यह आपातकाल है, तो अभी अपने स्थानीय आपातकालीन नंबर पर कॉल करें (अमेरिका में 911)।",
    meds: "आपकी दवाइयाँ", morning: "सुबह", midday: "दोपहर", evening: "शाम", bedtime: "सोने से पहले", as_needed: "केवल ज़रूरत होने पर",
    results: "आपकी जाँच के नतीजे", test: "जाँच", result: "नतीजा", range: "सामान्य सीमा", high: "ज़्यादा", low: "कम", normal: "सामान्य", unknown: "अज्ञात", critical: "सामान्य से बहुत दूर",
    next: "अगले कदम", key: "अन्य निर्देश", gloss: "शब्दों का मतलब", questions: "अपनी देखभाल टीम से पूछने के सवाल", unclear: "इन्हें अपनी देखभाल टीम से पक्का करें",
    listen: "सुनें", why: "यह किसलिए है", careful: "सावधानी", st_new: "नई", st_changed: "बदली गई", st_continue: "लेते रहें", st_stop: "लेना बंद करें",
    allergies: "एलर्जी", safety: "दवा सुरक्षा जाँच", pending: "नतीजे अभी नहीं आए", due: "तारीख", cat_diet: "खाना-पीना", cat_activity: "गतिविधि",
    cat_wound: "घाव की देखभाल", cat_monitor: "घर पर जाँचें", cat_other: "अन्य", more_info: "और जानें (MedlinePlus)",
    how: "कैसे", when: "कब", for_days: "{n} दिनों तक", for_weeks: "{n} हफ़्तों तक", with_food: "खाने के साथ", empty_stomach: "खाली पेट",
    max_per_day: "24 घंटे में {n} खुराक से ज़्यादा नहीं", daily_total: "दिन में ज़्यादा से ज़्यादा {mg} mg", ask_pharmacist: "अगली खुराक से पहले अपने फ़ार्मासिस्ट या डॉक्टर से पूछें।",
    f_1: "दिन में 1 बार", f_2: "दिन में 2 बार", f_3: "दिन में 3 बार", f_4: "दिन में 4 बार", f_qh: "हर {n} घंटे में", f_qhr: "हर {a} से {b} घंटे में",
    f_qod: "एक दिन छोड़कर", f_weekly: "हफ़्ते में 1 बार", f_bedtime: "सोने से पहले", f_morning: "हर सुबह", f_evening: "हर शाम", f_meals: "खाने के साथ",
    r_oral: "मुँह से", r_sl: "जीभ के नीचे", r_inhaled: "साँस से (इनहेलर)", r_subcut: "त्वचा के नीचे इंजेक्शन", r_im: "मांसपेशी में इंजेक्शन", r_iv: "नस में (IV)",
    r_topical: "त्वचा पर", r_eye_both: "दोनों आँखों में", r_eye_right: "दाहिनी आँख में", r_eye_left: "बाईं आँख में", r_ear: "कान में", r_nasal: "नाक में", r_rectal: "गुदा द्वारा", r_patch: "त्वचा पर पैच",
    forms: { tablet: ["गोली", "गोलियाँ"], capsule: ["कैप्सूल", "कैप्सूल"], puff: ["पफ़", "पफ़"], drop: ["बूंद", "बूंदें"], unit: ["यूनिट", "यूनिट"], mL: ["mL", "mL"], patch: ["पैच", "पैच"], spray: ["स्प्रे", "स्प्रे"], dose: ["खुराक", "खुराक"], suppository: ["सपोसिटरी", "सपोसिटरी"] },
    t_discharge: "अस्पताल से छुट्टी के निर्देश", t_lab_results: "आपकी लैब रिपोर्ट", t_prescription: "आपका पर्चा", t_visit_summary: "आपकी मुलाक़ात का सारांश", t_other: "आपका मेडिकल दस्तावेज़",
    sum_meds: "{n} दवाइयाँ", sum_stop: "{n} बंद करनी हैं", sum_warn: "{n} चेतावनी संकेत", sum_next: "{n} अगले कदम", sum_labs: "{n} नतीजे ({a} सामान्य सीमा से बाहर)", sum_intro: "इस दस्तावेज़ में:",
    lv_danger: "ज़रूरी", lv_caution: "जाँचें", lv_info: "जानने योग्य",
    ck_apap_over: "एक दिन में बहुत ज़्यादा एसिटामिनोफ़ेन (टाइलेनॉल)", ck_apap_max: "एसिटामिनोफ़ेन (टाइलेनॉल) की दैनिक सीमा पर", ck_apap_dup: "एसिटामिनोफ़ेन (टाइलेनॉल) एक से ज़्यादा दवाओं में है", ck_dup: "एक ही दवा दो बार लिखी है",
    ck_two_nsaid: "दो सूजन-रोधी दर्द निवारक (NSAID)", ck_bleed: "खून बहने का ज़्यादा ख़तरा", ck_two_anticoag: "ख़ून पतला करने वाली दो दवाइयाँ", ck_opioid_sedative: "नींद लाने और साँस धीमी करने वाली दो दवाइयाँ",
    ck_triple: "यह मेल गुर्दों पर ज़ोर डाल सकता है", ck_potassium: "पोटैशियम बढ़ाने वाली दवाइयाँ", ck_allergy: "एलर्जी से संभावित टकराव", ck_avoid_conflict: "दस्तावेज़ जिस दवा से बचने को कहता है, वह आपकी सूची में है",
    ck_mtx: "मेथोट्रेक्सेट रोज़ लेने वाली दवा के रूप में लिखा है", ck_max_dose: "सामान्य दैनिक अधिकतम से ज़्यादा", ck_stop_and_take: "बंद करने और लेने, दोनों में लिखा है", ck_ismp: "गलती पैदा करने वाला संक्षिप्त रूप",
    ck_critical: "नतीजा सामान्य से बहुत दूर", ck_no_freq: "कितनी बार लेनी है, साफ़ नहीं", ck_opioid_constipation: "ओपिओइड से कब्ज़ होती है", ck_unknown_drug: "दवा का नाम पहचाना नहीं गया",
    mt_badge: "मशीन अनुवाद", show_en: "अंग्रेज़ी दिखाएँ", num_fail: "अनुवाद ने एक संख्या बदल दी, इसलिए अंग्रेज़ी दिखाई गई है।",
    card_title: "मेरा दवा कार्ड", interp: "मुफ़्त दुभाषिया: अमेरिका में, संघीय पैसा पाने वाले अस्पतालों और क्लीनिकों को आपको बिना किसी शुल्क के मेडिकल दुभाषिया देना होता है। इसकी माँग करें।", card_note: "यह कार्ड हर मुलाक़ात, फ़ार्मेसी और इमरजेंसी में साथ लाएँ।",
  };

  S.ru = {
    summary: "Кратко", warnings: "Тревожные признаки", emergency: "Неотложно", call_doctor: "Позвоните врачу",
    callout: "Если вы считаете, что это неотложная ситуация, сейчас же позвоните в местную службу экстренной помощи (911 в США).",
    meds: "Ваши лекарства", morning: "Утро", midday: "День", evening: "Вечер", bedtime: "Перед сном", as_needed: "Только при необходимости",
    results: "Ваши анализы", test: "Анализ", result: "Результат", range: "Норма", high: "Повышен", low: "Понижен", normal: "Норма", unknown: "Неизвестно", critical: "Сильно вне нормы",
    next: "Следующие шаги", key: "Другие указания", gloss: "Объяснение терминов", questions: "Вопросы для вашего врача", unclear: "Уточните у медработников",
    listen: "Слушать", why: "Для чего", careful: "Осторожно", st_new: "НОВОЕ", st_changed: "ИЗМЕНЕНО", st_continue: "Продолжайте", st_stop: "ПРЕКРАТИТЕ",
    allergies: "Аллергии", safety: "Проверка безопасности лекарств", pending: "Результаты ещё не готовы", due: "Срок", cat_diet: "Питание", cat_activity: "Активность",
    cat_wound: "Уход за раной", cat_monitor: "Контроль дома", cat_other: "Другое", more_info: "Подробнее (MedlinePlus)",
    how: "Как", when: "Когда", for_days: "в течение {n} дн.", for_weeks: "в течение {n} нед.", with_food: "во время еды", empty_stomach: "натощак",
    max_per_day: "Не более {n} доз за 24 часа", daily_total: "До {mg} мг в день", ask_pharmacist: "Спросите фармацевта или врача до следующего приёма.",
    f_1: "1 раз в день", f_2: "2 раза в день", f_3: "3 раза в день", f_4: "4 раза в день", f_qh: "каждые {n} ч", f_qhr: "каждые {a}–{b} ч",
    f_qod: "через день", f_weekly: "1 раз в НЕДЕЛЮ", f_bedtime: "перед сном", f_morning: "каждое утро", f_evening: "каждый вечер", f_meals: "во время еды",
    r_oral: "внутрь", r_sl: "под язык", r_inhaled: "ингаляция (ингалятор)", r_subcut: "укол под кожу", r_im: "укол в мышцу", r_iv: "в вену",
    r_topical: "на кожу", r_eye_both: "в оба глаза", r_eye_right: "в правый глаз", r_eye_left: "в левый глаз", r_ear: "в ухо", r_nasal: "в нос", r_rectal: "ректально", r_patch: "пластырь на кожу",
    forms: { tablet: ["табл.", "табл."], capsule: ["капс.", "капс."], puff: ["вдох", "вдох."], drop: ["кап.", "кап."], unit: ["ед.", "ед."], mL: ["мл", "мл"], patch: ["пластырь", "пластыр."], spray: ["впрыск.", "впрыск."], dose: ["доза", "доз."], suppository: ["свеча", "свеч."] },
    t_discharge: "Ваши указания при выписке", t_lab_results: "Ваши результаты анализов", t_prescription: "Ваш рецепт", t_visit_summary: "Итоги вашего приёма", t_other: "Ваш медицинский документ",
    sum_meds: "лекарств: {n}", sum_stop: "прекратить: {n}", sum_warn: "тревожных признаков: {n}", sum_next: "следующих шагов: {n}", sum_labs: "анализов: {n} (вне нормы: {a})", sum_intro: "В документе:",
    lv_danger: "Важно", lv_caution: "Проверьте", lv_info: "Полезно знать",
    ck_apap_over: "Слишком много парацетамола (Тайленола) в день", ck_apap_max: "Предельная суточная доза парацетамола (Тайленола)", ck_apap_dup: "Парацетамол (Тайленол) входит в несколько лекарств", ck_dup: "Одно и то же лекарство указано дважды",
    ck_two_nsaid: "Два противовоспалительных обезболивающих (НПВП)", ck_bleed: "Повышенный риск кровотечения", ck_two_anticoag: "Два антикоагулянта", ck_opioid_sedative: "Два лекарства, вызывающих сонливость и замедляющих дыхание",
    ck_triple: "Это сочетание может нагружать почки", ck_potassium: "Лекарства, повышающие калий", ck_allergy: "Возможный конфликт с аллергией", ck_avoid_conflict: "Документ советует избегать лекарства из вашего списка",
    ck_mtx: "Метотрексат указан как ежедневное лекарство", ck_max_dose: "Больше обычной суточной нормы", ck_stop_and_take: "Указано и прекратить, и принимать", ck_ismp: "Сокращение, ведущее к ошибкам",
    ck_critical: "Результат сильно вне нормы", ck_no_freq: "Неясно, как часто принимать", ck_opioid_constipation: "Опиоиды вызывают запор", ck_unknown_drug: "Название лекарства не распознано",
    mt_badge: "машинный перевод", show_en: "Показать английский", num_fail: "Перевод изменил число, поэтому показан английский текст.",
    card_title: "Моя карточка лекарств", interp: "Бесплатный переводчик: в США больницы и клиники, получающие федеральное финансирование, обязаны бесплатно предоставить вам медицинского переводчика. Попросите об этом.", card_note: "Берите эту карточку на каждый приём, в аптеку и в отделение неотложной помощи.",
  };

  const lang = (id) => LANGS.find((l) => l.id === id) || LANGS[0];
  const hasTemplates = (id) => !!S[id];

  /** Template string for a key; falls back to English (then machine translation upstream). */
  function t(id, key, vars) {
    const table = S[id] || S.en;
    let s = table[key] ?? S.en[key] ?? key;
    if (vars) Object.entries(vars).forEach(([k, v]) => (s = s.split("{" + k + "}").join(v)));
    return s;
  }
  function form(id, f, n) {
    const table = (S[id] || S.en).forms;
    const pair = table[f] || S.en.forms[f] || [f, f];
    return n === 1 ? pair[0] : pair[1];
  }

  window.PlainlyI18n = { LANGS, S, t, form, lang, hasTemplates };
})();
