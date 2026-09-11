/* ═══════════════════════════════════════════════════════════════
   seedTypingContent.js — ek-baar chalane wali script

   FEATURE (naya): Typing exams/passages ka DOOSRA (MongoDB-backed)
   source khaali na rahe, isliye ye script usme real, turant-istemaal-
   layak content daal deti hai - Supabase down/unconfigured ho tab bhi
   fallback mein SIRF 2-3 generic passages nahi, balki har exam ke
   apne passages milते hain.

   Chalane ka tareeka (backend/ folder ke andar se):
     node seedTypingContent.js

   Dobara chalana SAFE hai - existing exams/passages upsert hote hain
   (duplicate nahi banते), title/text se match karke.
   ═══════════════════════════════════════════════════════════════ */
require('dotenv').config();
const mongoose = require('mongoose');
const TypingExam = require('./models/TypingExam');
const TypingPassage = require('./models/TypingPassage');

const EXAMS = [
  { examId: 'ssc-cgl',   name: 'SSC CGL',           category: 'central', minWpm: 35, minAcc: 90, timeMins: 10, languages: ['english'],         emoji: '🏛️', color: '#3b82f6' },
  { examId: 'ssc-chsl',  name: 'SSC CHSL',          category: 'central', minWpm: 35, minAcc: 90, timeMins: 10, languages: ['english', 'hindi'], emoji: '🏛️', color: '#3b82f6' },
  { examId: 'ssc-mts',   name: 'SSC MTS',           category: 'central', minWpm: 25, minAcc: 90, timeMins: 10, languages: ['english', 'hindi'], emoji: '🏛️', color: '#3b82f6' },
  { examId: 'agniveer',  name: 'Army Agniveer LDC',  category: 'defence', minWpm: 40, minAcc: 90, timeMins: 10, languages: ['english'],         emoji: '🛡️', color: '#f43f5e' },
  { examId: 'crpf',      name: 'CRPF LDC',          category: 'defence', minWpm: 35, minAcc: 90, timeMins: 10, languages: ['english', 'hindi'], emoji: '🛡️', color: '#f43f5e' },
  { examId: 'up-police', name: 'UP Police',          category: 'state',   minWpm: 25, minAcc: 80, timeMins: 10, languages: ['hindi'],           emoji: '🗺️', color: '#8b5cf6' },
  { examId: 'ahc',       name: 'Allahabad HC',       category: 'court',   minWpm: 30, minAcc: 90, timeMins: 10, languages: ['english', 'hindi'], emoji: '⚖️', color: '#f59e0b' },
  { examId: 'rajasthan', name: 'Rajasthan HC',       category: 'court',   minWpm: 30, minAcc: 90, timeMins: 10, languages: ['english'],         emoji: '⚖️', color: '#f59e0b' },
  { examId: 'rrb-ntpc',  name: 'RRB NTPC',           category: 'central', minWpm: 30, minAcc: 90, timeMins: 10, languages: ['english', 'hindi'], emoji: '🏛️', color: '#3b82f6' },
  { examId: 'bsnl',      name: 'BSNL TTA',           category: 'psu',     minWpm: 30, minAcc: 90, timeMins: 10, languages: ['english'],         emoji: '🔬', color: '#10b981' },
  { examId: 'mp-police', name: 'MP Police',          category: 'state',   minWpm: 25, minAcc: 80, timeMins: 10, languages: ['hindi'],           emoji: '🗺️', color: '#8b5cf6' },
  { examId: 'bihar-ssc', name: 'Bihar SSC',          category: 'state',   minWpm: 25, minAcc: 85, timeMins: 10, languages: ['hindi'],           emoji: '🗺️', color: '#8b5cf6' },
];

// Ek chhota, saaf pool - har exam ko uski language-capability ke hisaab
// se in mein se assign kar dete hain (neeche). Naye exam add karne par
// bas EXAMS array mein entry badhao, passages khud-ba-khud mil jaayenge.
const ENGLISH_PASSAGES = [
  { title: 'Rural Postal Services', difficulty: 'easy', text: 'India has one of the largest postal networks in the world, with a majority of its branches located in rural areas. The postal department has long served as a vital link between villages and towns, delivering letters, money orders, and small parcels. In recent years, the department has also started offering banking and insurance services through the same network, helping bring formal financial access to people who previously had none nearby.' },
  { title: 'National Cadet Corps', difficulty: 'easy', text: 'The National Cadet Corps is a voluntary organisation that gives school and college students basic military training along with lessons in discipline and leadership. Cadets take part in camps, parades, and social service activities throughout the year. Many young people who join the NCC later choose careers in the armed forces, though the training is equally valued for building confidence and a sense of duty among all who complete it.' },
  { title: 'Right to Information Act', difficulty: 'normal', text: 'The Right to Information Act was passed to make government functioning more transparent and accountable to citizens. Under this law, any citizen can file a written application asking a public authority for information about its work, decisions, or spending, and the authority is generally required to respond within thirty days. The Act also set up Information Commissions at the central and state level to hear appeals when a request is refused or ignored. Over the years, it has been used by journalists, activists, and ordinary citizens alike to question decisions that affect public money and public welfare.' },
  { title: 'Indian Railways Network', difficulty: 'normal', text: 'Indian Railways operates one of the largest rail networks in the world, carrying millions of passengers and a substantial share of the country\u2019s freight every single day. The network connects remote villages to major cities and forms the backbone of long-distance travel for most Indians. Over the decades, the railways have expanded from narrow, metre, and broad gauge lines into a mostly unified system, while also investing in electrification and safety upgrades. Beyond transport, Indian Railways is also one of the country\u2019s largest employers, running its own hospitals, schools, and training institutes for staff and their families.' },
  { title: 'Parliamentary Committee System', difficulty: 'hard', text: 'The Indian Parliament relies heavily on a system of committees to examine bills, budgets, and the working of government departments in greater detail than floor debates usually allow. Standing committees, each linked to one or more ministries, scrutinise proposed legislation clause by clause, call witnesses, and can recommend changes before a bill returns to the full house for a final vote. Because committee proceedings bring together members from different political parties working toward a shared report, they are often seen as a more deliberative and less adversarial part of the legislative process than open floor debate. Public accounts and estimates committees, in particular, play a central role in reviewing how effectively government funds have actually been spent against what was originally approved.' },
  { title: 'Census of India', difficulty: 'hard', text: 'The Census of India is conducted once every ten years and remains the single largest source of demographic, social, and economic data about the country\u2019s population. Enumerators visit nearly every household across cities, towns, and villages, recording details such as age, literacy, occupation, and housing conditions. The resulting data shapes decisions ranging from the delimitation of electoral constituencies to the allocation of federal funds for health, education, and infrastructure in different states. Because the exercise is so vast, it typically unfolds in two phases, first a house-listing phase and then the actual population enumeration, and involves training hundreds of thousands of temporary staff drawn mainly from teachers and other government employees.' },
];

const HINDI_PASSAGES = [
  { title: 'पंचायती राज व्यवस्था', difficulty: 'easy', text: 'पंचायती राज व्यवस्था भारत में स्थानीय स्वशासन की एक महत्वपूर्ण प्रणाली है। इसके तहत गाँव, ब्लॉक और जिला स्तर पर चुनी हुई संस्थाएँ काम करती हैं। इन संस्थाओं को सड़क, पानी और स्वच्छता जैसी बुनियादी सुविधाओं के प्रबंधन की जिम्मेदारी दी जाती है। संविधान के 73वें संशोधन के बाद इन्हें और अधिक अधिकार तथा नियमित चुनाव की गारंटी मिली।' },
  { title: 'राष्ट्रीय शिक्षा नीति', difficulty: 'easy', text: 'राष्ट्रीय शिक्षा नीति का उद्देश्य भारत की शिक्षा प्रणाली को अधिक लचीला और व्यावहारिक बनाना है। इसमें बच्चों को शुरुआती कक्षाओं में मातृभाषा में पढ़ाई का सुझाव दिया गया है। साथ ही उच्च शिक्षा में विषयों को चुनने की आज़ादी बढ़ाने पर भी जोर दिया गया है। इस नीति के तहत कौशल आधारित शिक्षा को भी महत्व दिया जाता है।' },
  { title: 'गंगा नदी सफाई अभियान', difficulty: 'normal', text: 'गंगा नदी भारत की सबसे लंबी और सबसे पवित्र नदियों में से एक मानी जाती है, और करोड़ों लोगों का जीवन इसी नदी के किनारे बसा हुआ है। वर्षों से बढ़ते औद्योगिक और घरेलू प्रदूषण के कारण इस नदी की सफाई एक बड़ी चुनौती बन गई है। इसे साफ करने के लिए सरकार ने एक विशेष मिशन शुरू किया, जिसके तहत सीवेज ट्रीटमेंट प्लांट लगाए गए और नदी किनारे के घाटों का सुधार किया गया। इस अभियान में स्थानीय समुदायों और स्वयंसेवी संस्थाओं की भागीदारी को भी प्रोत्साहित किया जाता है।' },
  { title: 'मध्याह्न भोजन योजना', difficulty: 'normal', text: 'मध्याह्न भोजन योजना सरकारी और सरकारी सहायता प्राप्त स्कूलों में पढ़ने वाले बच्चों को दोपहर का पौष्टिक भोजन उपलब्ध कराने के लिए चलाई जाती है। इस योजना का मुख्य उद्देश्य बच्चों के पोषण स्तर में सुधार लाना और साथ ही स्कूल में उनकी उपस्थिति बढ़ाना है। कई अध्ययनों में यह पाया गया है कि इस योजना के लागू होने के बाद गरीब परिवारों के बच्चों का स्कूल छोड़ने की दर कम हुई है। इसके संचालन में राज्य सरकारें और स्थानीय निकाय दोनों मिलकर काम करते हैं।' },
  { title: 'भारतीय रिज़र्व बैंक', difficulty: 'hard', text: 'भारतीय रिज़र्व बैंक देश का केंद्रीय बैंक है और मुद्रा जारी करने से लेकर बैंकिंग प्रणाली की निगरानी तक की जिम्मेदारी संभालता है। यह मौद्रिक नीति के माध्यम से ब्याज दरों को नियंत्रित करता है, जिसका सीधा असर महंगाई और आर्थिक वृद्धि पर पड़ता है। इसके अलावा रिज़र्व बैंक विदेशी मुद्रा भंडार का प्रबंधन भी करता है और वाणिज्यिक बैंकों के लिए नियम बनाता है ताकि जमाकर्ताओं का पैसा सुरक्षित रहे। समय-समय पर यह बैंक वित्तीय समावेशन को बढ़ावा देने के लिए भी नई योजनाएँ और दिशानिर्देश जारी करता रहता है, विशेष रूप से ग्रामीण और अर्ध-शहरी क्षेत्रों में बैंकिंग सुविधाएँ पहुँचाने के लिए।' },
  { title: 'आपदा प्रबंधन प्राधिकरण', difficulty: 'hard', text: 'राष्ट्रीय आपदा प्रबंधन प्राधिकरण की स्थापना प्राकृतिक और मानव-निर्मित आपदाओं से निपटने की तैयारी, रोकथाम और राहत कार्यों को बेहतर ढंग से संगठित करने के लिए की गई थी। बाढ़, भूकंप, चक्रवात जैसी घटनाओं के समय यह संस्था राज्य सरकारों के साथ मिलकर बचाव अभियान चलाने में मदद करती है। इसके साथ ही यह आम नागरिकों और स्कूलों में आपदा के समय बरती जाने वाली सावधानियों को लेकर जागरूकता कार्यक्रम भी चलाती रहती है। हाल के वर्षों में इसने मौसम संबंधी चेतावनी प्रणाली को भी राज्यों के साथ बेहतर तरीके से जोड़ने पर काम किया है, ताकि आपदा आने से पहले ही लोगों को समय रहते सूचित किया जा सके।' },
];

async function seed() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI .env mein nahi mila. Rukते हैं।');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log('✅ MongoDB se connect ho gaya.');

  for (const exam of EXAMS) {
    await TypingExam.findOneAndUpdate({ examId: exam.examId }, exam, { upsert: true, new: true });

    const pools = [];
    if (exam.languages.includes('english')) pools.push(...ENGLISH_PASSAGES.map(p => ({ ...p, language: 'english' })));
    if (exam.languages.includes('hindi')) pools.push(...HINDI_PASSAGES.map(p => ({ ...p, language: 'hindi' })));

    for (const p of pools) {
      await TypingPassage.findOneAndUpdate(
        { examId: exam.examId, title: p.title, language: p.language },
        {
          examId: exam.examId,
          title: p.title,
          text: p.text,
          language: p.language,
          difficulty: p.difficulty,
          wordCount: p.text.trim().split(/\s+/).length,
        },
        { upsert: true }
      );
    }
    console.log(`  • ${exam.name}: ${pools.length} passages ready`);
  }

  console.log(`✅ ${EXAMS.length} exams aur unke passages seed ho gaye.`);
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('❌ Seed fail hui:', err);
  process.exit(1);
});
