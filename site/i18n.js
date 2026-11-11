/*
 * Clippit languages. Shared by the extension and the web app.
 * To add a language: add it to LANGS, then add a block to UI and TYPES.
 * Anything missing falls back to English, so a partly translated language never breaks.
 *
 * NOTE: Hindi and Tamil text was written for this prototype and should be
 * reviewed by a native speaker before real-world use.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ClippitI18n = factory();
})(typeof self !== "undefined" ? self : this, function () {
  const LANGS = {
    en: { label: "English", speech: "en-IN" },
    hi: { label: "हिन्दी (Hindi)", speech: "hi-IN" },
    ta: { label: "தமிழ் (Tamil)", speech: "ta-IN" },
  };

  const UI = {
    en: {
      banner_title: "This looks like a scam",
      pause_title: "It looks like you're about to be robbed. Want help?",
      pause_question: "Is someone on the phone or chat telling you to make this payment?",
      yes: "Yes", yes_long: "Yes, someone is guiding me", no: "No",
      hangup: "Please hang up. Real banks, police and courts never ask you to pay like this. Call your bank on the number printed on your card, or talk to family first.",
      cancel: "Cancel payment", ask_family: "Ask family", read_aloud: "Read aloud",
      cont: "Continue anyway", cont_wait: "Continue anyway ({n})",
      dismiss: "Dismiss", not_scam: "Not a scam", not_scam_site: "Not a scam, don't warn on this site",
      do_now: "Do this now:",
      generic_do_now: "Do not pay. Call your family, or your bank on the number printed on your card.",
      otp_tip: "Never share an OTP. If unsure, call your bank on the number printed on your card.",
      next_label: "What usually happens next",
      report_title: "Report it",
      report_text: "If money was lost, call 1930 (national cybercrime helpline) as soon as possible.",
      copy_open: "Copy evidence and open cybercrime portal",
      copied: "Evidence copied. Paste it into the complaint.",
      copy_failed: "Could not copy automatically.",
      chakshu: "Report a fraud call or SMS (Chakshu)",
      family_msg: "Hold on, I might be getting scammed. Please call me.",
      spoken_warning: "Warning. This looks like a scam.",
      spoken_suffix: "Do not pay. Please ask your family first.",
      no_voice: "No voice for this language is installed on this device, so it will be read in the default voice.",
      no_speech: "This browser cannot read aloud.",
      language: "Language",
      verdict_susp: "Be careful. Some things look suspicious.",
      verdict_safe: "No scam signals found.",
      safe_note: "That does not prove it is safe. If it asks for money, a code or a link click, check with your bank using the number on your card.",
      why_worried: "Why Clippit is worried",
      marked_msg: "Your message, with the warning phrases marked",
    },
    hi: {
      banner_title: "यह एक धोखाधड़ी (स्कैम) लगती है",
      pause_title: "ऐसा लगता है कि आप ठगे जाने वाले हैं। क्या आपको मदद चाहिए?",
      pause_question: "क्या कोई फ़ोन या चैट पर आपसे यह भुगतान करने को कह रहा है?",
      yes: "हाँ", yes_long: "हाँ, कोई मुझे बता रहा है", no: "नहीं",
      hangup: "कृपया फ़ोन काट दें। असली बैंक, पुलिस या अदालत कभी इस तरह पैसे नहीं माँगते। अपने कार्ड पर छपे नंबर पर बैंक को फ़ोन करें, या पहले परिवार से बात करें।",
      cancel: "भुगतान रद्द करें", ask_family: "परिवार से पूछें", read_aloud: "सुनें",
      cont: "फिर भी आगे बढ़ें", cont_wait: "फिर भी आगे बढ़ें ({n})",
      dismiss: "बंद करें", not_scam: "यह स्कैम नहीं है", not_scam_site: "यह स्कैम नहीं है, इस साइट पर चेतावनी न दें",
      do_now: "अभी यह करें:",
      generic_do_now: "पैसे न भेजें। अपने परिवार को, या कार्ड पर छपे नंबर पर अपने बैंक को फ़ोन करें।",
      otp_tip: "OTP कभी किसी को न बताएँ। शक हो तो अपने कार्ड पर छपे नंबर पर बैंक को फ़ोन करें।",
      next_label: "आगे आमतौर पर क्या होता है",
      report_title: "शिकायत करें",
      report_text: "अगर पैसे चले गए हों, तो तुरंत 1930 (राष्ट्रीय साइबर अपराध हेल्पलाइन) पर फ़ोन करें।",
      copy_open: "सबूत कॉपी करें और साइबर क्राइम पोर्टल खोलें",
      copied: "सबूत कॉपी हो गया। इसे शिकायत में चिपका दें।",
      copy_failed: "अपने-आप कॉपी नहीं हो सका।",
      chakshu: "फ़र्ज़ी कॉल या SMS की शिकायत (चक्षु)",
      family_msg: "रुकिए, शायद मेरे साथ धोखाधड़ी हो रही है। कृपया मुझे फ़ोन करें।",
      spoken_warning: "सावधान। यह एक स्कैम लगता है।",
      spoken_suffix: "पैसे न भेजें। पहले अपने परिवार से पूछें।",
      no_voice: "इस डिवाइस पर इस भाषा की आवाज़ उपलब्ध नहीं है, इसलिए सामान्य आवाज़ में पढ़ा जाएगा।",
      no_speech: "यह ब्राउज़र पढ़कर नहीं सुना सकता।",
      language: "भाषा",
      verdict_susp: "सावधान रहें। कुछ बातें संदिग्ध लगती हैं।",
      verdict_safe: "कोई स्कैम संकेत नहीं मिला।",
      safe_note: "इसका मतलब यह नहीं कि यह सुरक्षित है। अगर इसमें पैसे, कोई कोड या लिंक दबाने को कहा गया है, तो अपने कार्ड पर छपे नंबर से बैंक से पूछ लें।",
      why_worried: "Clippit को चिंता क्यों है",
      marked_msg: "आपका संदेश, चेतावनी वाले शब्द चिह्नित",
    },
    ta: {
      banner_title: "இது ஒரு மோசடி போல் தெரிகிறது",
      pause_title: "நீங்கள் ஏமாற்றப்படப் போகிறீர்கள் போல் தெரிகிறது. உதவி வேண்டுமா?",
      pause_question: "யாராவது தொலைபேசியிலோ சாட்டிலோ இந்தப் பணத்தைச் செலுத்தச் சொல்கிறார்களா?",
      yes: "ஆம்", yes_long: "ஆம், யாரோ என்னை வழிநடத்துகிறார்கள்", no: "இல்லை",
      hangup: "தயவுசெய்து அழைப்பைத் துண்டிக்கவும். உண்மையான வங்கிகள், காவல்துறை, நீதிமன்றங்கள் ஒருபோதும் இப்படிப் பணம் கேட்காது. உங்கள் கார்டில் அச்சிடப்பட்ட எண்ணில் வங்கியை அழைக்கவும், அல்லது முதலில் குடும்பத்தினருடன் பேசவும்.",
      cancel: "பணம் செலுத்துவதை ரத்து செய்", ask_family: "குடும்பத்தினரிடம் கேள்", read_aloud: "படித்துக் காட்டு",
      cont: "இருந்தாலும் தொடர்", cont_wait: "இருந்தாலும் தொடர் ({n})",
      dismiss: "மூடு", not_scam: "இது மோசடி அல்ல", not_scam_site: "இது மோசடி அல்ல, இந்தத் தளத்தில் எச்சரிக்க வேண்டாம்",
      do_now: "இப்போது இதைச் செய்யுங்கள்:",
      generic_do_now: "பணம் அனுப்ப வேண்டாம். குடும்பத்தினரையோ, கார்டில் உள்ள எண்ணில் வங்கியையோ அழைக்கவும்.",
      otp_tip: "OTP-ஐ யாரிடமும் பகிர வேண்டாம். சந்தேகம் இருந்தால் கார்டில் உள்ள எண்ணில் வங்கியை அழைக்கவும்.",
      next_label: "பொதுவாக அடுத்து என்ன நடக்கும்",
      report_title: "புகார் செய்யுங்கள்",
      report_text: "பணம் இழந்திருந்தால் உடனே 1930 (தேசிய சைபர் குற்ற உதவி எண்) ஐ அழைக்கவும்.",
      copy_open: "ஆதாரத்தை நகலெடுத்து சைபர் குற்றப் புகார் தளத்தைத் திற",
      copied: "ஆதாரம் நகலெடுக்கப்பட்டது. புகாரில் ஒட்டவும்.",
      copy_failed: "தானாக நகலெடுக்க முடியவில்லை.",
      chakshu: "போலி அழைப்பு அல்லது SMS புகார் (சக்ஷு)",
      family_msg: "நிறுத்துங்கள், நான் ஏமாற்றப்படலாம். தயவுசெய்து என்னை அழைக்கவும்.",
      spoken_warning: "எச்சரிக்கை. இது ஒரு மோசடி போல் தெரிகிறது.",
      spoken_suffix: "பணம் அனுப்ப வேண்டாம். முதலில் குடும்பத்தினரிடம் கேளுங்கள்.",
      no_voice: "இந்தச் சாதனத்தில் இந்த மொழிக்கான குரல் இல்லை, எனவே இயல்பான குரலில் படிக்கப்படும்.",
      no_speech: "இந்த உலாவி படித்துக் காட்ட முடியாது.",
      language: "மொழி",
      verdict_susp: "கவனமாக இருங்கள். சில விஷயங்கள் சந்தேகத்துக்குரியவை.",
      verdict_safe: "மோசடி அறிகுறிகள் எதுவும் இல்லை.",
      safe_note: "இது பாதுகாப்பானது என்று அர்த்தமில்லை. பணம், குறியீடு அல்லது இணைப்பைக் கேட்டால், கார்டில் உள்ள எண்ணில் வங்கியிடம் சரிபார்க்கவும்.",
      why_worried: "Clippit ஏன் கவலைப்படுகிறது",
      marked_msg: "உங்கள் செய்தி, எச்சரிக்கை சொற்கள் குறிக்கப்பட்டுள்ளன",
    },
  };

  // Scam-type name and "do this now" line, by type id (ids come from detector.js TYPES)
  const TYPES = {
    hi: {
      digital_arrest: ["“डिजिटल अरेस्ट” धोखाधड़ी", "फ़ोन काट दें। कोई भी पुलिस या अदालत फ़ोन या वीडियो कॉल पर गिरफ़्तार नहीं करती। परिवार को बताएँ।"],
      safe_account: ["“सुरक्षित खाता” धोखाधड़ी", "रुकें। आपके पैसे ‘बचाने’ के लिए किसी बैंक या RBI खाते की ज़रूरत नहीं होती।"],
      kyc: ["फ़र्ज़ी KYC / खाता बंद होने का लिंक", "लिंक न खोलें। अपने बैंक का ऐप खुद खोलें, या कार्ड पर छपे नंबर पर फ़ोन करें।"],
      otp: ["OTP / पिन की चोरी", "OTP, पिन या CVV कभी किसी को न बताएँ।"],
      remote_access: ["रिमोट-एक्सेस धोखाधड़ी", "ऐप इंस्टॉल न करें। अगर कर लिया हो तो हटा दें और अपने बैंक को फ़ोन करें।"],
      upi_collect: ["UPI ‘कलेक्ट रिक्वेस्ट’ की चाल", "मना कर दें। पैसे पाने के लिए पिन की ज़रूरत नहीं होती।"],
      parcel: ["फ़र्ज़ी पार्सल / कस्टम्स शुल्क", "लिंक का इस्तेमाल न करें। कूरियर के आधिकारिक ऐप या वेबसाइट पर खुद जाँचें।"],
      prize: ["इनाम / लॉटरी धोखाधड़ी", "अनदेखा करें। जिस प्रतियोगिता में आपने भाग नहीं लिया, उसे आप जीत नहीं सकते।"],
      invest_job: ["निवेश / टास्क-जॉब धोखाधड़ी", "पैसे जमा न करें। पक्का मुनाफ़ा कहीं नहीं होता।"],
      family: ["परिवार में इमरजेंसी का झूठ", "पहले उस व्यक्ति को उसके पुराने नंबर पर फ़ोन करें। ऐसा सवाल पूछें जिसका जवाब सिर्फ़ वही जानता हो।"],
      bank_change: ["फ़र्ज़ी बैंक-विवरण बदलाव (सप्लायर धोखाधड़ी)", "सप्लायर को उस नंबर पर फ़ोन करें जो आपके पास पहले से है। संदेश वाला नंबर कभी इस्तेमाल न करें।"],
      fake_paid: ["फ़र्ज़ी ‘भुगतान हो गया’ की चाल", "अपने बैंक या UPI ऐप में खुद बैलेंस देखें। पैसे वहाँ दिखने के बाद ही माल भेजें।"],
      qr_receive: ["QR ‘पैसे पाएँ’ की चाल", "स्कैन न करें। पैसे पाने के लिए स्कैन या पिन की ज़रूरत नहीं होती।"],
      tax_notice: ["फ़र्ज़ी टैक्स / GST नोटिस", "आधिकारिक पोर्टल पर खुद लॉगिन करके असली नोटिस देखें। लिंक का इस्तेमाल न करें।"],
      loan_fee: ["फ़र्ज़ी लोन / सब्सिडी शुल्क", "पहले कोई पैसा न दें। बैंक या योजना कार्यालय से सीधे पूछें।"],
      sent_by_mistake: ["‘गलती से पैसे भेज दिए’ की चाल", "पहले अपना बैलेंस देखें। पैसे सिर्फ़ अपने बैंक के ज़रिए लौटाएँ।"],
      electricity: ["फ़र्ज़ी बिजली कनेक्शन कटने की धमकी", "बिजली कंपनी के आधिकारिक ऐप में बिल जाँचें। संदेश वाले नंबर पर फ़ोन न करें।"],
    },
    ta: {
      digital_arrest: ["“டிஜிட்டல் கைது” மோசடி", "அழைப்பைத் துண்டிக்கவும். காவல்துறையோ நீதிமன்றமோ தொலைபேசி அல்லது வீடியோ அழைப்பில் யாரையும் கைது செய்யாது. குடும்பத்தினரிடம் சொல்லுங்கள்."],
      safe_account: ["“பாதுகாப்பு கணக்கு” மோசடி", "நிறுத்துங்கள். உங்கள் பணத்தைக் ‘காப்பாற்ற’ எந்த வங்கி அல்லது RBI கணக்கும் தேவையில்லை."],
      kyc: ["போலி KYC / கணக்கு முடக்கம் இணைப்பு", "இணைப்பைத் திறக்க வேண்டாம். உங்கள் வங்கியின் ஆப்பை நீங்களே திறக்கவும், அல்லது கார்டில் உள்ள எண்ணை அழைக்கவும்."],
      otp: ["OTP / பின் திருட்டு", "OTP, பின் அல்லது CVV ஐ யாரிடமும் ஒருபோதும் பகிர வேண்டாம்."],
      remote_access: ["ரிமோட்-அணுகல் மோசடி", "அந்த ஆப்பை நிறுவ வேண்டாம். ஏற்கனவே நிறுவியிருந்தால் நீக்கிவிட்டு வங்கியை அழைக்கவும்."],
      upi_collect: ["UPI ‘கலெக்ட் கோரிக்கை’ தந்திரம்", "நிராகரிக்கவும். பணம் பெற பின் தேவையில்லை."],
      parcel: ["போலி பார்சல் / சுங்கக் கட்டணம்", "இணைப்பைப் பயன்படுத்த வேண்டாம். கூரியரின் அதிகாரப்பூர்வ ஆப் அல்லது இணையதளத்தில் நீங்களே சரிபார்க்கவும்."],
      prize: ["பரிசு / லாட்டரி மோசடி", "புறக்கணியுங்கள். நீங்கள் கலந்துகொள்ளாத போட்டியில் வெல்ல முடியாது."],
      invest_job: ["முதலீடு / டாஸ்க் வேலை மோசடி", "பணம் செலுத்த வேண்டாம். உறுதியான லாபம் என்று எதுவும் இல்லை."],
      family: ["போலி குடும்ப அவசரநிலை", "முதலில் அந்த நபரை அவரது பழைய எண்ணில் அழைக்கவும். அவருக்கு மட்டும் தெரிந்த கேள்வி கேளுங்கள்."],
      bank_change: ["போலி வங்கி விவர மாற்றம் (சப்ளையர் மோசடி)", "உங்களிடம் ஏற்கனவே உள்ள எண்ணில் சப்ளையரை அழைக்கவும். செய்தியில் உள்ள எண்ணைப் பயன்படுத்த வேண்டாம்."],
      fake_paid: ["போலி ‘பணம் செலுத்திவிட்டேன்’ தந்திரம்", "உங்கள் சொந்த வங்கி அல்லது UPI ஆப்பில் இருப்பைப் பாருங்கள். அங்கே பணம் தெரிந்த பிறகே பொருளை அனுப்புங்கள்."],
      qr_receive: ["QR ‘பணம் பெறுங்கள்’ தந்திரம்", "ஸ்கேன் செய்ய வேண்டாம். பணம் பெற ஸ்கேன் அல்லது பின் தேவையில்லை."],
      tax_notice: ["போலி வரி / GST அறிவிப்பு", "அதிகாரப்பூர்வ தளத்தில் நீங்களே உள்நுழைந்து உண்மையான அறிவிப்புகளைப் பாருங்கள். இணைப்பைப் பயன்படுத்த வேண்டாம்."],
      loan_fee: ["போலி கடன் / மானியக் கட்டணம்", "முன்கூட்டியே எந்தப் பணமும் செலுத்த வேண்டாம். வங்கி அல்லது திட்ட அலுவலகத்தில் நேரடியாகக் கேளுங்கள்."],
      sent_by_mistake: ["‘தவறுதலாகப் பணம் அனுப்பிவிட்டேன்’ தந்திரம்", "முதலில் உங்கள் இருப்பைப் பாருங்கள். பணத்தை உங்கள் வங்கி மூலமே திருப்பி அனுப்புங்கள்."],
      electricity: ["போலி மின் இணைப்பு துண்டிப்பு மிரட்டல்", "மின்வாரியத்தின் அதிகாரப்பூர்வ ஆப்பில் கட்டணத்தைச் சரிபார்க்கவும். செய்தியில் உள்ள எண்ணை அழைக்க வேண்டாம்."],
    },
  };

  function ui(lang, key, vars) {
    let s = (UI[lang] && UI[lang][key]) || UI.en[key] || key;
    if (vars) for (const k of Object.keys(vars)) s = s.replace("{" + k + "}", vars[k]);
    return s;
  }

  // scamType comes from detector.js: { id, name, next, doNow }
  function typeInfo(lang, scamType) {
    if (!scamType) return null;
    const t = TYPES[lang] && TYPES[lang][scamType.id];
    return t ? { name: t[0], doNow: t[1] } : { name: scamType.name, doNow: scamType.doNow };
  }

  function spoken(lang, scamType) {
    const info = typeInfo(lang, scamType);
    return [ui(lang, "spoken_warning"), info ? info.name + "." : "", info ? info.doNow : ui(lang, "generic_do_now"), ui(lang, "spoken_suffix")]
      .filter(Boolean).join(" ");
  }

  return { LANGS, UI, TYPES, ui, typeInfo, spoken };
});
