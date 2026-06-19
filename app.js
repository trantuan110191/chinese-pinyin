const categories = {
  all: "Tất cả",
  personal: "Bản thân",
  family: "Gia đình",
  social: "Quan hệ",
  school: "Học tập",
  place: "Nơi chốn",
  time: "Thời gian",
  daily: "Hằng ngày",
  phrases: "Cụm từ",
};

const targetInitials = ["j", "q", "x", "z", "c", "s", "zh", "ch", "sh", "r"];

const initialTips = {
  z: "Không bật hơi mạnh. Đầu lưỡi chạm nhẹ sau răng trên rồi mở ra, gần âm “dz”.",
  c: "Cùng vị trí với z nhưng bật một luồng hơi rõ. Đặt tay trước miệng để cảm nhận hơi.",
  s: "Giữ một khe hẹp sau răng trên để hơi đi ra liên tục, gần âm “x” trong tiếng Việt miền Bắc.",
  j: "Mặt lưỡi nâng gần ngạc cứng, đầu lưỡi để thấp. Âm ngắn và không bật hơi mạnh.",
  q: "Cùng vị trí với j nhưng bật hơi rõ. Nghe gần “ch” nhẹ kèm luồng hơi.",
  x: "Mặt lưỡi gần ngạc cứng, để hơi ma sát nhẹ; môi không tròn như khi đọc sh.",
  zh: "Cong nhẹ đầu lưỡi về phía sau, chặn rồi mở hơi; không bật hơi mạnh.",
  ch: "Cùng vị trí với zh nhưng bật hơi mạnh. Tờ giấy trước miệng nên rung rõ.",
  sh: "Cong nhẹ đầu lưỡi và để hơi ma sát liên tục; môi có thể hơi tròn.",
  r: "Vị trí lưỡi gần sh nhưng dây thanh rung. Không đọc giống r rung mạnh của tiếng Việt.",
};

const pronunciationWords = [
  { initial: "z", hanzi: "在", pinyin: "zài", meaning: "ở; đang", level: 1 },
  { initial: "z", hanzi: "怎么", pinyin: "zěnme", meaning: "thế nào", level: 1 },
  { initial: "z", hanzi: "再见", pinyin: "zàijiàn", meaning: "tạm biệt", level: 1 },
  { initial: "z", hanzi: "坐", pinyin: "zuò", meaning: "ngồi", level: 1 },
  { initial: "z", hanzi: "昨天", pinyin: "zuótiān", meaning: "hôm qua", level: 1 },
  { initial: "z", hanzi: "走", pinyin: "zǒu", meaning: "đi; rời đi", level: 2 },

  { initial: "c", hanzi: "菜", pinyin: "cài", meaning: "món ăn; rau", level: 1 },
  { initial: "c", hanzi: "从", pinyin: "cóng", meaning: "từ; theo", level: 2 },
  { initial: "c", hanzi: "次", pinyin: "cì", meaning: "lần", level: 2 },
  { initial: "c", hanzi: "错", pinyin: "cuò", meaning: "sai", level: 2 },

  { initial: "s", hanzi: "三", pinyin: "sān", meaning: "ba", level: 1 },
  { initial: "s", hanzi: "四", pinyin: "sì", meaning: "bốn", level: 1 },
  { initial: "s", hanzi: "岁", pinyin: "suì", meaning: "tuổi", level: 1 },
  { initial: "s", hanzi: "送", pinyin: "sòng", meaning: "tặng; đưa tiễn", level: 2 },

  { initial: "j", hanzi: "家", pinyin: "jiā", meaning: "nhà; gia đình", level: 1 },
  { initial: "j", hanzi: "叫", pinyin: "jiào", meaning: "gọi; tên là", level: 1 },
  { initial: "j", hanzi: "几", pinyin: "jǐ", meaning: "mấy", level: 1 },
  { initial: "j", hanzi: "今天", pinyin: "jīntiān", meaning: "hôm nay", level: 1 },
  { initial: "j", hanzi: "九", pinyin: "jiǔ", meaning: "chín", level: 1 },
  { initial: "j", hanzi: "近", pinyin: "jìn", meaning: "gần", level: 2 },

  { initial: "q", hanzi: "七", pinyin: "qī", meaning: "bảy", level: 1 },
  { initial: "q", hanzi: "钱", pinyin: "qián", meaning: "tiền", level: 1 },
  { initial: "q", hanzi: "请", pinyin: "qǐng", meaning: "mời; xin", level: 1 },
  { initial: "q", hanzi: "去", pinyin: "qù", meaning: "đi", level: 1 },
  { initial: "q", hanzi: "前面", pinyin: "qiánmiàn", meaning: "phía trước", level: 2 },
  { initial: "q", hanzi: "起床", pinyin: "qǐchuáng", meaning: "thức dậy", level: 1 },

  { initial: "x", hanzi: "学习", pinyin: "xuéxí", meaning: "học tập", level: 1 },
  { initial: "x", hanzi: "学校", pinyin: "xuéxiào", meaning: "trường học", level: 1 },
  { initial: "x", hanzi: "喜欢", pinyin: "xǐhuan", meaning: "thích", level: 1 },
  { initial: "x", hanzi: "现在", pinyin: "xiànzài", meaning: "bây giờ", level: 1 },
  { initial: "x", hanzi: "星期", pinyin: "xīngqī", meaning: "tuần; thứ", level: 1 },
  { initial: "x", hanzi: "谢谢", pinyin: "xièxie", meaning: "cảm ơn", level: 1 },
  { initial: "x", hanzi: "想", pinyin: "xiǎng", meaning: "muốn; nghĩ", level: 1 },
  { initial: "x", hanzi: "小", pinyin: "xiǎo", meaning: "nhỏ", level: 1 },

  { initial: "zh", hanzi: "这", pinyin: "zhè", meaning: "đây; cái này", level: 1 },
  { initial: "zh", hanzi: "中国", pinyin: "Zhōngguó", meaning: "Trung Quốc", level: 1 },
  { initial: "zh", hanzi: "住", pinyin: "zhù", meaning: "sống; ở", level: 1 },
  { initial: "zh", hanzi: "中午", pinyin: "zhōngwǔ", meaning: "buổi trưa", level: 1 },
  { initial: "zh", hanzi: "知道", pinyin: "zhīdào", meaning: "biết", level: 1 },
  { initial: "zh", hanzi: "找", pinyin: "zhǎo", meaning: "tìm", level: 1 },

  { initial: "ch", hanzi: "吃", pinyin: "chī", meaning: "ăn", level: 1 },
  { initial: "ch", hanzi: "茶", pinyin: "chá", meaning: "trà", level: 1 },
  { initial: "ch", hanzi: "出租车", pinyin: "chūzūchē", meaning: "taxi", level: 1 },
  { initial: "ch", hanzi: "穿", pinyin: "chuān", meaning: "mặc", level: 1 },
  { initial: "ch", hanzi: "出", pinyin: "chū", meaning: "ra ngoài", level: 2 },
  { initial: "ch", hanzi: "长", pinyin: "cháng", meaning: "dài", level: 2 },

  { initial: "sh", hanzi: "是", pinyin: "shì", meaning: "là", level: 1 },
  { initial: "sh", hanzi: "什么", pinyin: "shénme", meaning: "cái gì", level: 1 },
  { initial: "sh", hanzi: "谁", pinyin: "shéi", meaning: "ai", level: 1 },
  { initial: "sh", hanzi: "说", pinyin: "shuō", meaning: "nói", level: 1 },
  { initial: "sh", hanzi: "水", pinyin: "shuǐ", meaning: "nước", level: 1 },
  { initial: "sh", hanzi: "书", pinyin: "shū", meaning: "sách", level: 1 },
  { initial: "sh", hanzi: "时候", pinyin: "shíhou", meaning: "lúc; thời gian", level: 1 },
  { initial: "sh", hanzi: "商店", pinyin: "shāngdiàn", meaning: "cửa hàng", level: 1 },

  { initial: "r", hanzi: "人", pinyin: "rén", meaning: "người", level: 1 },
  { initial: "r", hanzi: "热", pinyin: "rè", meaning: "nóng", level: 1 },
  { initial: "r", hanzi: "认识", pinyin: "rènshi", meaning: "quen; biết", level: 1 },
  { initial: "r", hanzi: "日", pinyin: "rì", meaning: "ngày", level: 1 },
  { initial: "r", hanzi: "肉", pinyin: "ròu", meaning: "thịt", level: 2 },
  { initial: "r", hanzi: "让", pinyin: "ràng", meaning: "để; nhường", level: 2 },
];

const words = [
  {
    hanzi: "你", pinyin: "nǐ", meaning: "bạn", category: "personal", sino: "nhĩ",
    type: "Chữ hình thanh", breakdown: "亻 (người) gợi nghĩa + 尔 (ěr) gợi âm.",
    origin: "Bộ 亻 cho biết chữ liên quan đến con người. Phần 尔 từng có âm gần với 你 hơn trong tiếng Trung thời xưa.",
    components: {
      meaning: ["亻", "rén", "Gợi nghĩa: người", "Dạng đứng của 人, vốn mô phỏng một người nhìn nghiêng."],
      sound: ["尔", "ěr", "Gợi âm", "尔 giúp gợi cách đọc cổ của 你. Nguồn gốc hình thể của 尔/爾 khá phức tạp, không cần ép thành một bức tranh để nhớ nghĩa “bạn”."]
    },
    mnemonic: "Thấy bộ người 亻, hãy nghĩ đến một người đang đứng trước mặt mình: đó là “bạn”.",
    sentence: ["你叫什么名字？", "Nǐ jiào shénme míngzi?", "Bạn tên là gì?"], sourceChar: "你"
  },
  {
    hanzi: "我", pinyin: "wǒ", meaning: "tôi, mình", category: "personal", sino: "ngã",
    type: "Chữ mượn âm", breakdown: "Dạng cổ giống một loại công cụ hoặc vũ khí có răng.",
    origin: "Chữ cổ ban đầu chỉ một vật giống vũ khí. Về sau chữ được mượn để ghi đại từ ngôi thứ nhất “tôi”.",
    mnemonic: "Nhìn nét móc như bàn tay tự chỉ về phía mình: “tôi”. Đây là mẹo nhớ, không phải nguồn gốc thật.",
    sentence: ["我是越南人。", "Wǒ shì Yuènán rén.", "Tôi là người Việt Nam."], sourceChar: "我"
  },
  {
    hanzi: "叫", pinyin: "jiào", meaning: "gọi; tên là", category: "personal", sino: "khiếu",
    type: "Chữ hình thanh", breakdown: "口 (miệng) gợi nghĩa + 丩 (jiū) gợi âm.",
    origin: "Bộ 口 liên quan đến tiếng phát ra từ miệng. Chữ được dùng cho hành động gọi và cách giới thiệu tên.",
    components: {
      meaning: ["口", "kǒu", "Gợi nghĩa: miệng", "Chữ tượng hình mô phỏng một cái miệng đang mở."],
      sound: ["丩", "jiū", "Gợi âm", "丩 vốn mô phỏng hai sợi dây quấn vào nhau. Trong 叫, hình dây không tạo nghĩa “gọi”; thành phần này chủ yếu gợi âm."]
    },
    mnemonic: "Mở miệng 口 gọi thật to tên của một người.",
    sentence: ["我叫明月。", "Wǒ jiào Míngyuè.", "Tôi tên là Minh Nguyệt."], sourceChar: "叫"
  },
  {
    hanzi: "什么", pinyin: "shénme", meaning: "cái gì; gì", category: "personal", sino: "thập ma",
    type: "Từ để hỏi", breakdown: "什 gồm 亻 + 十; 么 là dạng giản thể dùng trong từ hỏi.",
    origin: "什么 là một từ cố định trong tiếng Trung hiện đại. Không nên ghép nghĩa riêng từng nét để suy ra nghĩa “cái gì”.",
    mnemonic: "Khi chưa biết một người 亻 đang cầm thứ gì, hãy hỏi: 什么?",
    sentence: ["你想喝什么？", "Nǐ xiǎng hē shénme?", "Bạn muốn uống gì?"], sourceChar: "什"
  },
  {
    hanzi: "名字", pinyin: "míngzi", meaning: "tên", category: "personal", sino: "danh tự",
    type: "Từ ghép", breakdown: "名 là tên/danh xưng; 字 là chữ hoặc tên tự.",
    origin: "名 gồm 口 và một thành phần phía trên; 字 gồm mái nhà 宀 và đứa trẻ 子. Hai chữ kết hợp thành nghĩa thông dụng “tên”.",
    mnemonic: "Tên 名 được viết thành chữ 字 để mọi người biết bạn là ai.",
    sentence: ["你叫什么名字？", "Nǐ jiào shénme míngzi?", "Bạn tên là gì?"], sourceChar: "名"
  },
  {
    hanzi: "姓", pinyin: "xìng", meaning: "họ; mang họ", category: "personal", sino: "tính",
    type: "Chữ hình thanh", breakdown: "女 (nữ) gợi nghĩa + 生 (shēng) gợi âm.",
    origin: "Trong xã hội cổ, chữ liên hệ đến dòng họ và huyết thống. 生 làm thành phần gợi âm.",
    components: {
      meaning: ["女", "nǚ", "Gợi nghĩa: nữ", "Dạng cổ mô phỏng một người phụ nữ đang quỳ hoặc ngồi."],
      sound: ["生", "shēng", "Gợi âm", "生 vốn là hình mầm cây nhô khỏi mặt đất. Trong 姓, mầm cây giúp nhớ chữ 生 và âm shēng; vai trò chính của nó là gợi âm cho xìng."]
    },
    mnemonic: "Một người được sinh 生 ra trong một dòng họ; 女 giúp nhận ra cấu tạo chữ.",
    sentence: ["你姓什么？", "Nǐ xìng shénme?", "Bạn họ gì?"], sourceChar: "姓"
  },
  {
    hanzi: "哪国", pinyin: "nǎ guó", meaning: "nước nào", category: "personal", sino: "na quốc",
    type: "Cụm từ để hỏi", breakdown: "哪: 口 gợi nghĩa + 那 gợi âm. 国 là dạng giản thể của 國.",
    origin: "哪 dùng để hỏi lựa chọn “nào”. 国 chỉ một vùng đất được bao quanh, mang nghĩa quốc gia.",
    mnemonic: "Nhìn nhiều quốc gia trong một khung bản đồ và dùng miệng 口 hỏi: nước nào?",
    sentence: ["你是哪国人？", "Nǐ shì nǎ guó rén?", "Bạn là người nước nào?"], sourceChar: "哪"
  },
  {
    hanzi: "人", pinyin: "rén", meaning: "người", category: "personal", sino: "nhân",
    type: "Chữ tượng hình", breakdown: "Hai nét mô phỏng dáng một người đứng nghiêng.",
    origin: "Dạng chữ cổ là hình người nhìn từ bên cạnh. Qua thời gian, hình này được viết gọn thành hai nét 人.",
    mnemonic: "Hai nét như hai chân của một người đang bước đi.",
    sentence: ["他是中国人。", "Tā shì Zhōngguó rén.", "Anh ấy là người Trung Quốc."], sourceChar: "人"
  },
  {
    hanzi: "家", pinyin: "jiā", meaning: "nhà; gia đình", category: "family", sino: "gia",
    type: "Chữ hình thanh", breakdown: "宀 (mái nhà) gợi nghĩa + phần còn lại của 豭 (jiā) gợi âm.",
    origin: "Nghiên cứu cấu tạo hiện đại xem 宀 là thành phần nghĩa “mái nhà”, còn phần dưới có liên hệ đến thành phần gợi âm 豭.",
    components: {
      meaning: ["宀", "mián", "Gợi nghĩa: mái nhà", "Hình một mái che nhìn từ phía trước, cho biết chữ liên quan đến nơi ở."],
      sound: ["豭", "jiā", "Gợi âm đã rút gọn", "Phần dưới là dấu vết của thành phần 豭, nghĩa là lợn đực, dùng để gợi âm jiā. Câu chuyện “con lợn dưới mái nhà” dễ nhớ nhưng không nên coi là toàn bộ nguồn gốc chắc chắn của chữ 家."]
    },
    mnemonic: "Mọi người và vật nuôi cùng ở yên dưới một mái 宀: đó là nhà.",
    sentence: ["你家有几口人？", "Nǐ jiā yǒu jǐ kǒu rén?", "Gia đình bạn có mấy người?"], sourceChar: "家"
  },
  {
    hanzi: "有", pinyin: "yǒu", meaning: "có", category: "family", sino: "hữu",
    type: "Chữ hội ý cổ", breakdown: "Dạng hiện đại có nét giống tay 又 ở trên và 月 ở dưới.",
    origin: "Các dạng cổ thường được giải thích là một bàn tay giữ vật, từ đó biểu thị sự sở hữu. Cấu tạo đã thay đổi theo thời gian.",
    mnemonic: "Bàn tay đang giữ một vật: trong tay mình “có” nó.",
    sentence: ["我有一个哥哥。", "Wǒ yǒu yí ge gēge.", "Tôi có một anh trai."], sourceChar: "有"
  },
  {
    hanzi: "几", pinyin: "jǐ", meaning: "mấy; bao nhiêu", category: "family", sino: "kỷ",
    type: "Chữ giản thể", breakdown: "几 trong nghĩa “mấy” là dạng giản thể của 幾.",
    origin: "Hình 几 vốn cũng là một chữ cổ chỉ chiếc bàn nhỏ. Trong chữ giản thể, nó được dùng thay cho 幾 khi mang nghĩa “mấy”.",
    mnemonic: "Một chiếc bàn nhỏ chỉ có mấy chân? Hãy hỏi 几. Đây là mẹo dựa trên hình hiện đại.",
    sentence: ["你家有几口人？", "Nǐ jiā yǒu jǐ kǒu rén?", "Gia đình bạn có mấy người?"], sourceChar: "几"
  },
  {
    hanzi: "口", pinyin: "kǒu", meaning: "miệng; khẩu", category: "family", sino: "khẩu",
    type: "Chữ tượng hình", breakdown: "Khung vuông mô phỏng hình cái miệng mở.",
    origin: "Dạng cổ vẽ một cái miệng. Trong 几口人, 口 là lượng từ đếm thành viên gia đình.",
    mnemonic: "Một khung vuông như miệng đang mở. Mỗi “miệng ăn” là một người trong nhà.",
    sentence: ["我家有四口人。", "Wǒ jiā yǒu sì kǒu rén.", "Gia đình tôi có bốn người."], sourceChar: "口"
  },
  {
    hanzi: "谁", pinyin: "shéi", meaning: "ai", category: "family", sino: "thùy",
    type: "Chữ hình thanh", breakdown: "讠 (lời nói) gợi nghĩa + 隹 (zhuī) gợi âm trong chữ truyền thống 誰.",
    origin: "Chữ thuộc nhóm có thành phần nghĩa và thành phần âm. Cách đọc hiện đại đã thay đổi so với âm cổ.",
    components: {
      meaning: ["讠", "yán", "Gợi nghĩa: lời nói", "Dạng giản thể đứng bên trái của 言, báo hiệu chữ liên quan đến lời nói hoặc câu hỏi."],
      sound: ["隹", "zhuī", "Gợi âm", "隹 là chữ tượng hình một loài chim đuôi ngắn. Trong 谁, con chim không có nghĩa “ai”; nó gợi âm vì cách đọc từng gần nhau hơn trong tiếng Trung cổ."]
    },
    mnemonic: "Nghe một lời 讠 nhưng chưa biết người nói là ai: 谁?",
    sentence: ["这是谁？", "Zhè shì shéi?", "Đây là ai?"], sourceChar: "谁"
  },
  {
    hanzi: "这", pinyin: "zhè", meaning: "đây; cái này", category: "family", sino: "giá",
    type: "Chữ giản thể", breakdown: "这 là dạng giản thể của 這, có 辶 liên quan đến di chuyển.",
    origin: "Trong chữ truyền thống 這, 辶 là thành phần nghĩa và 言 là thành phần gợi âm. Chữ được dùng làm đại từ chỉ gần.",
    mnemonic: "Đi theo đường 辶 đến ngay chỗ gần mình: “đây”.",
    sentence: ["这是我妈妈。", "Zhè shì wǒ māma.", "Đây là mẹ tôi."], sourceChar: "这"
  },
  {
    hanzi: "妈妈", pinyin: "māma", meaning: "mẹ", category: "family", sino: "ma",
    type: "Chữ hình thanh", breakdown: "妈: 女 (nữ) gợi nghĩa + 马 (mǎ) gợi âm.",
    origin: "妈 là dạng giản thể của 媽. Bộ 女 cho biết nghĩa liên quan đến phụ nữ; 马 đảm nhiệm vai trò gợi âm.",
    components: {
      meaning: ["女", "nǚ", "Gợi nghĩa: nữ", "Dạng cổ mô phỏng người phụ nữ; trong 妈, nó định hướng nghĩa liên quan đến mẹ."],
      sound: ["马", "mǎ", "Gợi âm", "马 là chữ tượng hình con ngựa. Ở đây con ngựa chỉ giúp nhớ âm ma/mǎ gần với mā; nó không tạo nên nghĩa “mẹ”."]
    },
    mnemonic: "Bên cạnh người nữ 女 là âm ma của 马: māma, mẹ.",
    sentence: ["我妈妈是老师。", "Wǒ māma shì lǎoshī.", "Mẹ tôi là giáo viên."], sourceChar: "妈"
  },
  {
    hanzi: "哥哥", pinyin: "gēge", meaning: "anh trai", category: "family", sino: "ca",
    type: "Từ thân thuộc", breakdown: "哥 có hai thành phần 可 xếp trên dưới.",
    origin: "Nghĩa “anh trai” hình thành qua lịch sử sử dụng của chữ; hình hai 可 không phải bức tranh hai anh em.",
    mnemonic: "Hai chữ 可 xếp tầng như người anh luôn đứng phía trước che chở em. Đây là mẹo nhớ.",
    sentence: ["我哥哥是学生。", "Wǒ gēge shì xuésheng.", "Anh trai tôi là học sinh."], sourceChar: "哥"
  },
  {
    hanzi: "邻居", pinyin: "línjū", meaning: "hàng xóm", category: "social", sino: "lân cư",
    type: "Từ ghép chỉ người", breakdown: "邻 lín: gần kề, láng giềng + 居 jū: sống, ở.",
    origin: "邻 là dạng giản thể của 鄰. Chữ truyền thống có 邑, chỉ khu dân cư, và 粦 làm phần gợi âm. 居 ban đầu mô phỏng một người co chân ngồi xổm, rồi phát triển nghĩa ở lại và cư trú.",
    components: {
      title: "Nhìn riêng từng chữ trong 邻居",
      note: "Một người cư trú 居 ngay khu dân cư bên cạnh 邻 chính là hàng xóm.",
      items: [
        ["邻", "lín", "Nhà ở gần bên", "Bộ 阝 bên phải là dạng của 邑, liên quan đến làng xóm và nơi cư trú. Phần 令 trong chữ giản thể chủ yếu giữ vai trò gợi âm; hãy nhìn 阝 để nhớ nghĩa gần nhà, gần xóm."],
        ["居", "jū", "Ngồi lại rồi cư trú", "Dạng cổ của 居 giống một người co chân ngồi xổm. Từ ý ngồi lại một chỗ, chữ phát triển thành nghĩa sống và cư trú."]
      ]
    },
    mnemonic: "Người 居 sống ở khu nhà 阝 sát bên mình là 邻居, hàng xóm.",
    sentence: ["他是我的邻居。", "Tā shì wǒ de línjū.", "Anh ấy là hàng xóm của tôi."], sourceChar: "邻"
  },
  {
    hanzi: "同事", pinyin: "tóngshì", meaning: "đồng nghiệp", category: "social", sino: "đồng sự",
    type: "Từ ghép chỉ người", breakdown: "同 tóng: cùng, giống nhau + 事 shì: việc, công việc.",
    origin: "同 mang ý cùng chung hoặc giống nhau. 事 từng liên quan đến chức vụ và công việc phải đảm nhiệm. Hai chữ ghép lại chỉ những người cùng làm việc.",
    components: {
      title: "Nhìn riêng từng chữ trong 同事",
      note: "Đây là từ ghép rất thẳng nghĩa: cùng 同 làm một công việc 事.",
      items: [
        ["同", "tóng", "Cùng chung một chỗ", "Nguồn gốc chữ có nhiều cách phân tích. Để nhớ hình hiện đại, hãy tưởng tượng nhiều người cùng nói 口 và làm việc trong một khung chung 冂. Đây là mẹo nhớ, không phải kết luận về hình gốc."],
        ["事", "shì", "Việc phải làm", "Chữ cổ liên hệ đến chức vụ và việc được giao. Hình thể đã biến đổi nhiều, nên hãy nhớ nó như một công việc có nhiều bước cần xử lý, không cần ép từng nét thành đồ vật."]
      ]
    },
    mnemonic: "Hai người cùng 同 xử lý một việc 事 trong cơ quan là đồng nghiệp.",
    sentence: ["她是我的同事。", "Tā shì wǒ de tóngshì.", "Cô ấy là đồng nghiệp của tôi."], sourceChar: "同"
  },
  {
    hanzi: "室友", pinyin: "shìyǒu", meaning: "bạn cùng phòng", category: "social", sino: "thất hữu",
    type: "Từ ghép chỉ người", breakdown: "室 shì: phòng + 友 yǒu: bạn.",
    origin: "室 là chữ hội ý gồm mái nhà 宀 và 至, mang ý đi đến rồi dừng lại trong nhà. 友 có dạng cổ như hai bàn tay đưa về phía nhau để cùng giúp đỡ.",
    components: {
      title: "Nhìn riêng từng chữ trong 室友",
      note: "Người bạn 友 sống chung một căn phòng 室 là bạn cùng phòng.",
      items: [
        ["室", "shì", "Dừng chân dưới mái nhà", "宀 là mái nhà. 至 mang ý đi đến. Đi đến dưới mái nhà rồi dừng lại tạo thành căn phòng, nơi ở bên trong."],
        ["友", "yǒu", "Hai bàn tay giúp nhau", "Dạng cổ của 友 mô phỏng hai bàn tay phối hợp hoặc đưa về phía nhau, gợi sự giúp đỡ và thân thiết giữa bạn bè."]
      ]
    },
    mnemonic: "Dưới mái phòng 室 có một người bạn luôn đưa tay giúp đỡ 友: bạn cùng phòng.",
    sentence: ["我的室友是中国人。", "Wǒ de shìyǒu shì Zhōngguó rén.", "Bạn cùng phòng của tôi là người Trung Quốc."], sourceChar: "室"
  },
  {
    hanzi: "网友", pinyin: "wǎngyǒu", meaning: "bạn trên mạng", category: "social", sino: "võng hữu",
    type: "Từ ghép hiện đại", breakdown: "网 wǎng: mạng, lưới + 友 yǒu: bạn.",
    origin: "网 là chữ tượng hình một tấm lưới với các sợi đan chéo, rồi được dùng cho mạng lưới và Internet. 友 là hình hai bàn tay cùng giúp nhau.",
    components: {
      title: "Nhìn riêng từng chữ trong 网友",
      note: "Đây là từ hiện đại: người bạn 友 quen qua mạng 网.",
      items: [
        ["网", "wǎng", "Tấm lưới đan chéo", "Dạng cổ vẽ một tấm lưới bắt cá hoặc chim thú. Những đường nối chằng chịt rất giống mạng Internet ngày nay."],
        ["友", "yǒu", "Hai bàn tay kết bạn", "Hai bàn tay trong dạng chữ cổ gợi sự phối hợp và giúp đỡ. Vì vậy 友 mang nghĩa bạn bè và thân thiện."]
      ]
    },
    mnemonic: "Hai bàn tay 友 vẫn có thể kết bạn dù chỉ gặp nhau qua tấm lưới Internet 网.",
    sentence: ["她是我的网友。", "Tā shì wǒ de wǎngyǒu.", "Cô ấy là bạn trên mạng của tôi."], sourceChar: "网"
  },
  {
    hanzi: "朋友", pinyin: "péngyou", meaning: "bạn bè; người bạn", category: "social", sino: "bằng hữu",
    type: "Từ ghép chỉ người", breakdown: "朋 péng: bạn cùng nhóm + 友 yǒu: người thân thiết, giúp đỡ nhau.",
    origin: "朋 ban đầu có liên hệ đến những chuỗi vỏ sò dùng làm đơn vị hoặc vật có giá trị, rồi phát triển nghĩa những người cùng loại, cùng nhóm. 友 có dạng cổ như hai bàn tay cùng phối hợp.",
    components: {
      title: "Nhìn riêng từng chữ trong 朋友",
      note: "Hai chữ đều có nghĩa gần với bạn bè, ghép lại thành từ thông dụng nhất để nói “người bạn”.",
      items: [
        ["朋", "péng", "Những chuỗi vỏ sò đi thành đôi", "Một cách giải thích phổ biến xem dạng cổ là các chuỗi vỏ sò đặt cạnh nhau. Từ những vật cùng nhóm, 朋 phát triển nghĩa người cùng lớp, cùng nhóm và bạn bè."],
        ["友", "yǒu", "Hai bàn tay giúp nhau", "Hai bàn tay đưa về cùng một phía tạo hình ảnh hai người phối hợp, thân thiết và giúp đỡ nhau."]
      ]
    },
    mnemonic: "Bạn bè là những người cùng nhóm 朋 và sẵn sàng đưa tay giúp nhau 友.",
    sentence: ["他是我的好朋友。", "Tā shì wǒ de hǎo péngyou.", "Anh ấy là bạn tốt của tôi."], sourceChar: "朋"
  },
  {
    hanzi: "同学", pinyin: "tóngxué", meaning: "bạn học; bạn cùng lớp", category: "social", sino: "đồng học",
    type: "Từ ghép chỉ người", breakdown: "同 tóng: cùng + 学 xué: học.",
    origin: "同 mang nghĩa cùng chung. Dạng cổ của 學 có hình bàn tay sắp xếp hoặc truyền dạy, cùng đứa trẻ dưới mái nhà. Trong chữ giản thể 学, ý học tập vẫn được giữ lại.",
    components: {
      title: "Nhìn riêng từng chữ trong 同学",
      note: "Người cùng 同 học 学 với mình là bạn học hoặc bạn cùng lớp.",
      items: [
        ["同", "tóng", "Cùng chung", "Hãy nhớ hình hiện đại như nhiều người cùng ở trong một khung và cùng nói 口. Đây là mẹo trực quan cho nghĩa “cùng”."],
        ["学", "xué", "Đứa trẻ đang học", "Dạng truyền thống 學 có bàn tay phía trên và đứa trẻ 子 dưới mái nhà, gợi cảnh người lớn truyền dạy cho trẻ nhỏ."]
      ]
    },
    mnemonic: "Cùng 同 ngồi học 学 trong một lớp thì trở thành bạn học.",
    sentence: ["他是我的同学。", "Tā shì wǒ de tóngxué.", "Anh ấy là bạn học của tôi."], sourceChar: "学"
  },
  {
    hanzi: "学校", pinyin: "xuéxiào", meaning: "trường học", category: "school", sino: "học hiệu",
    type: "Từ ghép", breakdown: "学 là học; 校 có 木 gợi nghĩa + 交 (jiāo) gợi âm.",
    origin: "學 cổ có hình bàn tay và đứa trẻ trong việc học. 校 ban đầu liên quan đến đồ gỗ; nghĩa “trường” phát triển về sau.",
    components: {
      meaning: ["木", "mù", "Gợi nghĩa cổ: gỗ", "木 là chữ tượng hình một cái cây. Trong 校, nó liên quan đến nghĩa cổ về vật hoặc kết cấu bằng gỗ."],
      sound: ["交", "jiāo", "Gợi âm cho 校", "交 mang nghĩa giao nhau, kết giao. Trong 校 xiào, nó chủ yếu gợi âm lịch sử; không nên hiểu “cây giao nhau” là nguồn gốc của nghĩa trường học."]
    },
    mnemonic: "Đến nơi có cây 木 và nhiều người trao đổi 交 để học 学: trường học.",
    sentence: ["你在哪个学校学习？", "Nǐ zài nǎ ge xuéxiào xuéxí?", "Bạn học ở trường nào?"], sourceChar: "学"
  },
  {
    hanzi: "学习", pinyin: "xuéxí", meaning: "học tập", category: "school", sino: "học tập",
    type: "Từ ghép", breakdown: "学 là học kiến thức; 习 là luyện tập, dạng giản thể của 習.",
    origin: "Dạng cổ của 習 có 羽, liên hệ đến việc chim non tập vỗ cánh nhiều lần. Từ đó có nghĩa luyện và ôn.",
    mnemonic: "Học 学 một điều rồi luyện 习 nhiều lần mới nhớ lâu.",
    sentence: ["我学习汉语。", "Wǒ xuéxí Hànyǔ.", "Tôi học tiếng Trung."], sourceChar: "习"
  },
  {
    hanzi: "学生", pinyin: "xuésheng", meaning: "học sinh; sinh viên", category: "school", sino: "học sinh",
    type: "Từ ghép", breakdown: "学 là học + 生 là người học hoặc người đang trưởng thành.",
    origin: "生 có dạng cổ giống một mầm cây mọc lên khỏi mặt đất, mang ý sinh ra và phát triển.",
    mnemonic: "Người học 学 lớn lên như mầm cây 生: học sinh.",
    sentence: ["你是学生吗？", "Nǐ shì xuésheng ma?", "Bạn có phải là học sinh không?"], sourceChar: "生"
  },
  {
    hanzi: "汉语", pinyin: "Hànyǔ", meaning: "tiếng Trung", category: "school", sino: "Hán ngữ",
    type: "Từ ghép", breakdown: "汉 chỉ Hán/Trung Hoa; 语 là ngôn ngữ, gồm 讠 + 吾.",
    origin: "语 là chữ hình thanh: 讠 liên quan đến lời nói, 吾 gợi âm. 汉 là dạng giản thể của 漢.",
    mnemonic: "Có lời nói 讠 thì có ngôn ngữ 语; 汉语 là ngôn ngữ Hán.",
    sentence: ["你会说汉语吗？", "Nǐ huì shuō Hànyǔ ma?", "Bạn biết nói tiếng Trung không?"], sourceChar: "语"
  },
  {
    hanzi: "老", pinyin: "lǎo", meaning: "già; lâu năm", category: "school", sino: "lão",
    type: "Chữ tượng hình", breakdown: "Hình một người cao tuổi có tóc dài, lưng khom và chống gậy.",
    origin: "Trong giáp cốt văn, 老 trông như một người già nhìn nghiêng: tóc dài trên đầu, thân người cúi xuống và tay tựa vào gậy. Qua thời gian, bức hình được viết vuông vắn thành sáu nét như hiện nay.",
    mnemonic: "Nhìn phần trên như mái tóc dài của ông cụ. Phần thân nghiêng xuống vì lưng đã khom; nét xiên và móc phía dưới gợi cánh tay cùng chiếc gậy chống. Ông cụ ấy chính là 老: già, lớn tuổi.",
    sentence: ["他很老。", "Tā hěn lǎo.", "Ông ấy đã lớn tuổi."], sourceChar: "老"
  },
  {
    hanzi: "老师", pinyin: "lǎoshī", meaning: "giáo viên", category: "school", sino: "lão sư",
    type: "Từ ghép xưng hô", breakdown: "老 lǎo: già, lâu năm, đáng kính + 师 shī: thầy, người có chuyên môn.",
    origin: "老 vốn là chữ tượng hình một người già: tóc dài, lưng khom và tựa vào gậy. 师 là dạng giản thể của 師, từng có các nghĩa như quân đội, người dẫn dắt, rồi phát triển nghĩa thầy hoặc chuyên gia.",
    components: {
      title: "Nhìn riêng từng chữ trong 老师",
      note: "Đây là từ ghép, không phải một chữ hình thanh. Hai chữ cùng góp nghĩa tạo thành cách gọi giáo viên.",
      items: [
        ["老", "lǎo", "Ông cụ khom lưng", "Dạng cổ vẽ một người già có tóc dài, thân khom xuống và chống gậy. Trong chữ hiện đại, phần trên gợi mái tóc và đầu; nét xiên, móc phía dưới có thể liên tưởng thành thân người cùng chiếc gậy. Đây là hình tượng có cơ sở từ dạng chữ cổ."],
        ["师", "shī", "Thầy, người dẫn dắt", "师 là chữ giản thể của 師. Hình hiện đại không còn là một tranh tượng hình dễ nhận ra, nên không cần ép các nét thành đồ vật. Hãy nhớ nghĩa chính là thầy, bậc chuyên môn hoặc người dẫn dắt."]
      ]
    },
    mnemonic: "Hãy nhìn 老 như một ông cụ tóc dài, lưng đã khom và phải chống gậy. Người từng trải ấy làm 师, người thầy dẫn dắt học trò. 老师 vì thế là giáo viên.",
    sentence: ["她是我的汉语老师。", "Tā shì wǒ de Hànyǔ lǎoshī.", "Cô ấy là giáo viên tiếng Trung của tôi."], sourceChar: "老"
  },
  {
    hanzi: "工作", pinyin: "gōngzuò", meaning: "công việc; làm việc", category: "school", sino: "công tác",
    type: "Từ ghép", breakdown: "工 là công việc/kỹ thuật; 作 có 亻 liên quan đến người thực hiện.",
    origin: "工 có dạng cổ giống một dụng cụ. 作 là chữ hình thanh có bộ người 亻, chỉ hành động làm hoặc tạo ra.",
    mnemonic: "Một người 亻 dùng công cụ 工 để làm 作 việc.",
    sentence: ["你做什么工作？", "Nǐ zuò shénme gōngzuò?", "Bạn làm công việc gì?"], sourceChar: "工"
  },
  {
    hanzi: "在", pinyin: "zài", meaning: "ở; đang", category: "place", sino: "tại",
    type: "Chữ chỉ vị trí", breakdown: "Dạng hiện đại gồm phần 才 và 土 (đất).",
    origin: "Chữ đã biến đổi qua nhiều dạng. 土 nhấn mạnh nơi chốn hoặc mặt đất; nghĩa hiện đại là ở tại một vị trí.",
    mnemonic: "Đặt chân trên đất 土 và đứng yên tại đó: 在.",
    sentence: ["我在学校学习。", "Wǒ zài xuéxiào xuéxí.", "Tôi học ở trường."], sourceChar: "在"
  },
  {
    hanzi: "哪儿", pinyin: "nǎr", meaning: "ở đâu; đâu", category: "place", sino: "na nhi",
    type: "Từ để hỏi", breakdown: "哪 nghĩa là nào/đâu + 儿 là âm hóa er trong khẩu ngữ miền Bắc.",
    origin: "哪 là chữ hình thanh với 口 và 那. 儿 trong 哪儿 chủ yếu đánh dấu cách phát âm, không mang nghĩa “đứa trẻ”.",
    mnemonic: "Dùng miệng 口 hỏi vị trí nào: 哪儿?",
    sentence: ["你住在哪儿？", "Nǐ zhù zài nǎr?", "Bạn sống ở đâu?"], sourceChar: "哪"
  },
  {
    hanzi: "去", pinyin: "qù", meaning: "đi", category: "place", sino: "khứ",
    type: "Chữ có nguồn gốc cổ", breakdown: "Hình hiện đại gồm 土 ở trên và 厶 ở dưới.",
    origin: "Nguồn gốc hình thể của 去 có nhiều cách giải thích. Nghĩa thông dụng từ sớm là rời một nơi, đi khỏi.",
    mnemonic: "Rời mảnh đất 土 đang đứng để đi tới nơi khác.",
    sentence: ["你去哪儿？", "Nǐ qù nǎr?", "Bạn đi đâu?"], sourceChar: "去"
  },
  {
    hanzi: "怎么", pinyin: "zěnme", meaning: "thế nào; làm sao", category: "place", sino: "chẩm ma",
    type: "Từ để hỏi", breakdown: "怎 gồm 乍 gợi âm + 心 (tim, suy nghĩ) gợi nghĩa.",
    origin: "怎么 là từ hỏi cách thức. 心 ở đáy 怎 liên hệ đến suy nghĩ, cảm nhận hoặc trạng thái tinh thần.",
    mnemonic: "Trong tim 心 đang băn khoăn phải làm thế nào: 怎么?",
    sentence: ["你怎么去学校？", "Nǐ zěnme qù xuéxiào?", "Bạn đi đến trường bằng cách nào?"], sourceChar: "怎"
  },
  {
    hanzi: "现在", pinyin: "xiànzài", meaning: "bây giờ; hiện tại", category: "time", sino: "hiện tại",
    type: "Từ ghép", breakdown: "现 là xuất hiện/hiện tại + 在 là ở tại.",
    origin: "现 là dạng giản thể của 現, một chữ hình thanh có 王/玉 và 見. Nghĩa phát triển thành hiện ra, hiện tại.",
    mnemonic: "Điều đang hiện 现 và đang ở 在 trước mắt chính là bây giờ.",
    sentence: ["现在几点？", "Xiànzài jǐ diǎn?", "Bây giờ là mấy giờ?"], sourceChar: "现"
  },
  {
    hanzi: "几点", pinyin: "jǐ diǎn", meaning: "mấy giờ", category: "time", sino: "kỷ điểm",
    type: "Cụm từ để hỏi", breakdown: "几 hỏi số lượng; 点 nghĩa là điểm, giờ đúng.",
    origin: "点 là dạng giản thể của 點, gồm 黑 gợi nghĩa và 占 gợi âm. Nghĩa “giờ” đến từ ý một điểm trên đồng hồ.",
    mnemonic: "Kim đồng hồ đang chỉ vào điểm 点 thứ mấy 几?",
    sentence: ["现在几点？", "Xiànzài jǐ diǎn?", "Bây giờ là mấy giờ?"], sourceChar: "点"
  },
  {
    hanzi: "今天", pinyin: "jīntiān", meaning: "hôm nay", category: "time", sino: "kim thiên",
    type: "Từ ghép", breakdown: "今 là hiện nay + 天 là ngày/trời.",
    origin: "天 có dạng cổ là một người với phần đầu được nhấn mạnh, rồi phát triển nghĩa bầu trời và ngày. 今 chỉ thời điểm hiện tại.",
    mnemonic: "Ngày 天 ở ngay lúc hiện tại 今 là hôm nay.",
    sentence: ["今天几号？", "Jīntiān jǐ hào?", "Hôm nay là ngày bao nhiêu?"], sourceChar: "天"
  },
  {
    hanzi: "星期", pinyin: "xīngqī", meaning: "tuần; thứ", category: "time", sino: "tinh kỳ",
    type: "Từ ghép", breakdown: "星 là sao; 期 là kỳ hạn, khoảng thời gian.",
    origin: "星 là chữ hình thanh: 日 gợi nghĩa ánh sáng, 生 gợi âm. 期 có 月 liên quan đến chu kỳ thời gian.",
    mnemonic: "Các ngôi sao 星 quay qua một chu kỳ 期: một tuần.",
    sentence: ["今天星期几？", "Jīntiān xīngqī jǐ?", "Hôm nay là thứ mấy?"], sourceChar: "星"
  },
  {
    hanzi: "喜欢", pinyin: "xǐhuan", meaning: "thích", category: "daily", sino: "hỉ hoan",
    type: "Từ ghép", breakdown: "喜 là vui thích; 欢 là dạng giản thể của 歡.",
    origin: "喜 trong dạng cổ liên hệ đến nhạc cụ/trống và miệng, gợi cảnh vui mừng. 欢 mang nghĩa vui vẻ, hoan hỉ.",
    mnemonic: "Vui 喜 và hân hoan 欢 khi gặp điều mình thích.",
    sentence: ["你喜欢吃什么？", "Nǐ xǐhuan chī shénme?", "Bạn thích ăn gì?"], sourceChar: "喜"
  },
  {
    hanzi: "吃", pinyin: "chī", meaning: "ăn", category: "daily", sino: "ngật",
    type: "Chữ hình thanh", breakdown: "口 (miệng) gợi nghĩa + 乞 (qǐ) gợi âm.",
    origin: "Bộ 口 cho biết hành động liên quan đến miệng. Phần 乞 đảm nhiệm vai trò gợi âm lịch sử.",
    components: {
      meaning: ["口", "kǒu", "Gợi nghĩa: miệng", "Khung vuông là chữ tượng hình cái miệng, nên rất hợp với hành động ăn."],
      sound: ["乞", "qǐ", "Gợi âm", "乞 hiện mang nghĩa “xin, cầu”. Trong 吃, nó được dùng để gợi âm cổ; không cần biến hình 乞 thành thức ăn hay người đang ăn."]
    },
    mnemonic: "Thức ăn đi vào miệng 口: ăn 吃.",
    sentence: ["我喜欢吃米饭。", "Wǒ xǐhuan chī mǐfàn.", "Tôi thích ăn cơm."], sourceChar: "吃"
  },
  {
    hanzi: "喝", pinyin: "hē", meaning: "uống", category: "daily", sino: "hát",
    type: "Chữ hình thanh", breakdown: "口 (miệng) gợi nghĩa + 曷 (hé) gợi âm.",
    origin: "Bộ 口 biểu thị hoạt động của miệng. 曷 là phần gợi âm, không phải hình một cốc nước.",
    components: {
      meaning: ["口", "kǒu", "Gợi nghĩa: miệng", "口 là hình cái miệng, cho biết hành động uống diễn ra bằng miệng."],
      sound: ["曷", "hé", "Gợi âm", "曷 là một chữ cổ có cấu tạo phức tạp. Trong 喝, chỉ cần nhớ nó gợi âm hé/hē; không nên tưởng tượng đây là cốc nước."]
    },
    mnemonic: "Đưa cốc tới miệng 口 để uống 喝.",
    sentence: ["我想喝茶。", "Wǒ xiǎng hē chá.", "Tôi muốn uống trà."], sourceChar: "喝"
  },
  {
    hanzi: "会", pinyin: "huì", meaning: "biết, có thể; họp", category: "daily", sino: "hội",
    type: "Chữ giản thể", breakdown: "会 là dạng giản thể của 會, nghĩa gốc liên quan đến tụ họp.",
    origin: "Dạng cổ của 會 biểu thị nhiều phần gặp và hợp lại. Nghĩa “biết làm” phát triển trong cách dùng ngữ pháp hiện đại.",
    mnemonic: "Kiến thức gặp và tụ lại trong đầu, nên mình “biết” làm.",
    sentence: ["我会说一点儿汉语。", "Wǒ huì shuō yìdiǎnr Hànyǔ.", "Tôi biết nói một chút tiếng Trung."], sourceChar: "会"
  },
  {
    hanzi: "说", pinyin: "shuō", meaning: "nói", category: "daily", sino: "thuyết",
    type: "Chữ hình thanh", breakdown: "讠 (lời nói) gợi nghĩa + 兑 (duì) gợi âm.",
    origin: "说 là dạng giản thể của 說. Bộ 言/讠 liên hệ trực tiếp đến lời nói; 兑 gợi âm lịch sử.",
    components: {
      meaning: ["讠", "yán", "Gợi nghĩa: lời nói", "讠 là dạng giản thể của 言 khi đứng bên trái, thường xuất hiện trong chữ liên quan đến nói năng."],
      sound: ["兑", "duì", "Gợi âm cổ", "Ngày nay duì và shuō nghe khá khác, nhưng chúng gần nhau hơn trong tiếng Trung cổ. 兑 không mang nghĩa “nói” trong chữ này."]
    },
    mnemonic: "Hễ thấy 讠, hãy nghĩ tới lời được nói ra.",
    sentence: ["你会说汉语吗？", "Nǐ huì shuō Hànyǔ ma?", "Bạn biết nói tiếng Trung không?"], sourceChar: "说"
  },
  {
    hanzi: "天气", pinyin: "tiānqì", meaning: "thời tiết", category: "daily", sino: "thiên khí",
    type: "Từ ghép", breakdown: "天 là trời + 气 là khí, hơi, không khí.",
    origin: "气 là chữ tượng hình, dạng cổ mô phỏng những luồng hơi hoặc mây bốc lên. 天 chỉ bầu trời/ngày.",
    mnemonic: "Nhìn luồng khí 气 trên trời 天 để biết thời tiết.",
    sentence: ["今天天气怎么样？", "Jīntiān tiānqì zěnmeyàng?", "Hôm nay thời tiết thế nào?"], sourceChar: "气"
  },
  {
    hanzi: "多少", pinyin: "duōshao", meaning: "bao nhiêu", category: "daily", sino: "đa thiểu",
    type: "Từ để hỏi", breakdown: "多 là nhiều + 少 là ít.",
    origin: "少 có dạng những nét nhỏ, biểu thị số lượng nhỏ. 多 dùng hai thành phần lặp lại để gợi số lượng lớn hơn.",
    mnemonic: "Chưa biết là nhiều 多 hay ít 少 thì hỏi: bao nhiêu?",
    sentence: ["这个多少钱？", "Zhège duōshao qián?", "Cái này bao nhiêu tiền?"], sourceChar: "少"
  },
  {
    hanzi: "钱", pinyin: "qián", meaning: "tiền", category: "daily", sino: "tiền",
    type: "Chữ hình thanh", breakdown: "钅 (kim loại) gợi nghĩa + 戋 (jiān) gợi âm.",
    origin: "钱 là dạng giản thể của 錢. Tiền cổ từng được đúc bằng kim loại nên chữ mang bộ 金/钅.",
    components: {
      meaning: ["钅", "jīn", "Gợi nghĩa: kim loại", "钅 là dạng đứng của 金. Tiền xu cổ được đúc bằng kim loại nên phần này định hướng nghĩa."],
      sound: ["戋", "jiān", "Gợi âm", "戋 giúp gợi âm cho qián. Hình thể và lịch sử của thành phần này không cần ép thành câu chuyện về đồng tiền."]
    },
    mnemonic: "Thấy bộ kim loại 钅, hãy nghĩ đến những đồng tiền xu kêu leng keng.",
    sentence: ["这个十块钱。", "Zhège shí kuài qián.", "Cái này giá mười tệ."], sourceChar: "钱"
  },
  {
    hanzi: "上车", pinyin: "shàngchē", meaning: "lên xe", category: "phrases", sino: "thượng xa",
    type: "Cụm động-tân", breakdown: "上 là lên, bước lên + 车 là xe.",
    origin: "Cụm từ chỉ hành động bước lên một phương tiện.",
    mnemonic: "Đi lên 上 rồi vào xe 车: lên xe.",
    sentence: ["火车来了，我们快上车吧。", "Huǒchē lái le, wǒmen kuài shàngchē ba.", "Tàu đến rồi, chúng ta mau lên tàu thôi."],
    sourceChar: "上",
    phraseAnalysis: {
      structure: "Động từ 上 “lên, bước lên” + tân ngữ 车 “xe”. Đây là cấu trúc động-tân.",
      grammar: "Trong 上车, 上 mang nghĩa “lên phương tiện”. Danh từ chỉ phương tiện đứng trực tiếp sau động từ: 上车, 上飞机. Khi nói bước xuống, dùng 下车.",
      characters: [
        { hanzi: "上", pinyin: "shàng", type: "Chữ chỉ sự", origin: "Dạng cổ đặt một nét ngắn hoặc chấm phía trên một nét mốc dài để biểu thị “ở trên, đi lên”. Nét dọc được thêm về sau để phân biệt với 二.", memory: "Nhìn phần nhỏ nằm trên đường mốc: ở phía trên.", source: "上" },
        { hanzi: "车", pinyin: "chē", type: "Chữ tượng hình", origin: "Dạng cổ mô phỏng một cỗ xe chiến. Chữ giản thể 车 được điều chỉnh từ dạng viết thảo của 車.", memory: "Khung nét gọn như trục và thân một chiếc xe.", source: "车" }
      ],
      extensions: [["下车", "xiàchē", "xuống xe"], ["坐车", "zuòchē", "đi xe"], ["上飞机", "shàng fēijī", "lên máy bay"]]
    }
  },
  {
    hanzi: "半年", pinyin: "bànnián", meaning: "nửa năm", category: "phrases", sino: "bán niên",
    type: "Cụm định lượng thời gian", breakdown: "半 là một nửa + 年 là năm.",
    origin: "Cụm từ chỉ khoảng thời gian sáu tháng.",
    mnemonic: "Một nửa 半 của một năm 年 là nửa năm.",
    sentence: ["我学中文半年了。", "Wǒ xué Zhōngwén bànnián le.", "Tôi học tiếng Trung được nửa năm rồi."],
    sourceChar: "半",
    phraseAnalysis: {
      structure: "Từ chỉ lượng 半 “một nửa” + đơn vị thời gian 年 “năm”.",
      grammar: "Nói 半年, không nói 半个年. Với các đơn vị thời gian quen thuộc, 半 thường đứng trực tiếp trước đơn vị: 半天, 半个月, 半年.",
      characters: [
        { hanzi: "半", pinyin: "bàn", type: "Chữ hội ý", origin: "Dạng cổ thường được giải thích là 八 biểu thị tách đôi kết hợp với 牛, gợi việc chia một vật lớn thành hai nửa.", memory: "Hai nét trên mở sang hai phía như một vật vừa được chia đôi.", source: "半" },
        { hanzi: "年", pinyin: "nián", type: "Nguồn gốc có nhiều cách phân tích", origin: "Dạng cổ thường được nhìn như một người mang bó lúa, gắn mùa thu hoạch với chu kỳ một năm. Một cách phân tích cổ khác coi 禾 gợi nghĩa và 千 gợi âm.", memory: "Người mang lúa về sau một vụ mùa: một năm lại trôi qua.", source: "年" }
      ],
      extensions: [["半天", "bàntiān", "nửa ngày; một lúc lâu"], ["半个月", "bàn ge yuè", "nửa tháng"], ["一年", "yì nián", "một năm"]]
    }
  },
  {
    hanzi: "国家", pinyin: "guójiā", meaning: "quốc gia; đất nước", category: "phrases", sino: "quốc gia",
    type: "Từ ghép đẳng lập", breakdown: "国 là nước, quốc gia + 家 là nhà, cộng đồng.",
    origin: "Hai yếu tố gần nghĩa kết hợp thành danh từ chỉ đất nước.",
    mnemonic: "Nhiều mái nhà 家 cùng sống trong một quốc gia 国.",
    sentence: ["越南是一个美丽的国家。", "Yuènán shì yí ge měilì de guójiā.", "Việt Nam là một đất nước xinh đẹp."],
    sourceChar: "国",
    phraseAnalysis: {
      structure: "国 “nước” + 家 “nhà, cộng đồng”. Hai yếu tố kết hợp thành danh từ 国家 “quốc gia, đất nước”.",
      grammar: "国家 là danh từ. Có thể nói 一个国家 “một quốc gia”, 我的国家 “đất nước tôi”, 国家的名字 “tên của quốc gia”.",
      characters: [
        { hanzi: "国", pinyin: "guó", type: "Chữ hình thanh, giản thể của 國", origin: "Trong 國, 囗 gợi nghĩa vùng được bao quanh, còn 或 gợi âm. 玉 trong dạng giản thể 国 là phần thay thế rút gọn cho 或; không phải nguồn gốc “viên ngọc được bảo vệ”.", memory: "Khung 囗 giúp nhớ ranh giới của một đất nước. Đây là mẹo nhớ phần nghĩa.", source: "国" },
        { hanzi: "家", pinyin: "jiā", type: "Chữ hình thanh", origin: "宀 gợi nghĩa mái nhà. Phần dưới liên hệ với phần còn lại của 豭 jiā và đảm nhiệm vai trò gợi âm; cách kể “heo dưới mái nhà tạo nên gia đình” phù hợp làm mẹo nhớ hơn là kết luận nguồn gốc duy nhất.", memory: "Một mái nhà 宀 che chở cho cuộc sống bên dưới: nhà, gia đình.", source: "家" }
      ],
      extensions: [["中国", "Zhōngguó", "Trung Quốc"], ["国籍", "guójí", "quốc tịch"], ["家人", "jiārén", "người nhà"]]
    }
  },
  {
    hanzi: "放学", pinyin: "fàngxué", meaning: "tan học", category: "phrases", sino: "phóng học",
    type: "Động từ cố định", breakdown: "放 mang nghĩa cho ra về + 学 liên quan đến việc học.",
    origin: "Cụm đã cố định nghĩa là buổi học kết thúc hoặc học sinh được ra về.",
    mnemonic: "Việc học 学 được tạm thả ra 放: tan học.",
    sentence: ["我们下午五点放学。", "Wǒmen xiàwǔ wǔ diǎn fàngxué.", "Chúng tôi tan học lúc năm giờ chiều."],
    sourceChar: "放",
    phraseAnalysis: {
      structure: "放 “cho ra, thả ra” + 学 “việc học”. Toàn cụm đã được từ vựng hóa với nghĩa “tan học”.",
      grammar: "Người mới nên dùng 放学 như một động từ cố định: 五点放学 “tan học lúc 5 giờ”, 放学以后 “sau khi tan học”. Không nên máy móc tách thành 放三天学; muốn nói nghỉ ba ngày, dùng 放三天假 hoặc 请三天假 tùy ngữ cảnh.",
      characters: [
        { hanzi: "放", pinyin: "fàng", type: "Chữ hình thanh", origin: "攵 là thành phần gợi nghĩa liên quan đến hành động của bàn tay; 方 fāng là phần gợi âm. Nghĩa phát triển gồm đặt, thả, cho đi.", memory: "Một bàn tay 攵 buông vật ra: thả, cho đi. Đây là mẹo nhớ.", source: "放" },
        { hanzi: "学", pinyin: "xué", type: "Chữ giản thể của 學", origin: "Dạng cổ của 學 thể hiện đứa trẻ 子 học dưới mái nhà 宀, cùng các thành phần liên quan đến truyền dạy; 爻 có vai trò gợi âm. 学 là dạng giản thể hiện đại.", memory: "Đứa trẻ 子 ngồi dưới mái nhà để học.", source: "学" }
      ],
      extensions: [["上学", "shàngxué", "đi học"], ["放假", "fàngjià", "nghỉ học; nghỉ lễ"], ["放学以后", "fàngxué yǐhòu", "sau khi tan học"]]
    }
  },
  {
    hanzi: "回家", pinyin: "huíjiā", meaning: "về nhà", category: "phrases", sino: "hồi gia",
    type: "Cụm động-tân", breakdown: "回 là quay về + 家 là nhà.",
    origin: "Cụm từ chỉ trở về nơi ở hoặc gia đình của mình.",
    mnemonic: "Quay lại 回 mái nhà 家: về nhà.",
    sentence: ["太晚了，我要回家了。", "Tài wǎn le, wǒ yào huíjiā le.", "Muộn quá rồi, tôi phải về nhà đây."],
    sourceChar: "回",
    phraseAnalysis: {
      structure: "Động từ 回 “quay về” + tân ngữ nơi chốn 家 “nhà”.",
      grammar: "回 có thể mang trực tiếp nơi chốn: 回家, 回国, 回学校. 回到家 nhấn mạnh đã về tới nhà; 回家 chỉ hành động về nhà nói chung.",
      characters: [
        { hanzi: "回", pinyin: "huí", type: "Chữ tượng hình", origin: "Dạng cổ mô phỏng dòng nước chuyển động vòng tròn, từ đó biểu thị quay lại hoặc trở về.", memory: "Hai khung vuông như một đường quay vòng vào trong rồi trở lại.", source: "回" },
        { hanzi: "家", pinyin: "jiā", type: "Chữ hình thanh", origin: "宀 gợi nghĩa mái nhà; phần dưới liên hệ với 豭 jiā và gợi âm. Câu chuyện con heo dưới mái nhà nên được xem là mẹo liên tưởng.", memory: "Mái nhà 宀 là nơi mình quay về.", source: "家" }
      ],
      extensions: [["回国", "huíguó", "về nước"], ["回来", "huílái", "quay lại đây"], ["回到家", "huí dào jiā", "về tới nhà"]]
    }
  },
  {
    hanzi: "见面", pinyin: "jiànmiàn", meaning: "gặp mặt", category: "phrases", sino: "kiến diện",
    type: "Động từ ly hợp", breakdown: "见 là gặp, nhìn thấy + 面 là mặt.",
    origin: "Nghĩa đen là nhìn thấy mặt nhau, rồi trở thành động từ “gặp mặt”.",
    mnemonic: "Nhìn thấy 见 khuôn mặt 面 của nhau: gặp mặt.",
    sentence: ["明天我要跟朋友见面。", "Míngtiān wǒ yào gēn péngyou jiànmiàn.", "Ngày mai tôi sẽ gặp bạn."],
    sourceChar: "见",
    phraseAnalysis: {
      structure: "见 “gặp, nhìn thấy” + 面 “mặt”. Đây là một động từ ly hợp, tức là hình thức giống động-tân và có cách dùng đặc biệt.",
      grammar: "Không nói 见面他. Hãy nói 跟他见面 hoặc 和他见面. Nếu dùng 见 như động từ thường, có thể nói 见他 “gặp anh ấy”.",
      characters: [
        { hanzi: "见", pinyin: "jiàn", type: "Chữ tượng hình, giản thể của 見", origin: "Dạng cổ nhấn mạnh một con mắt 目 trên hình người, biểu thị dùng mắt để nhìn thấy. 见 là dạng giản thể hiện đại.", memory: "Một người với con mắt thật lớn đang nhìn.", source: "见" },
        { hanzi: "面", pinyin: "miàn", type: "Chữ tượng hình", origin: "Dạng cổ mô phỏng đường viền khuôn mặt với con mắt 目 ở giữa.", memory: "Khung ngoài là khuôn mặt, phần giữa là mắt.", source: "面" }
      ],
      extensions: [["再见", "zàijiàn", "tạm biệt; hẹn gặp lại"], ["见朋友", "jiàn péngyou", "gặp bạn"], ["第一次见面", "dì yī cì jiànmiàn", "gặp mặt lần đầu"]]
    }
  },
  {
    hanzi: "看病", pinyin: "kànbìng", meaning: "đi khám bệnh; khám bệnh", category: "phrases", sino: "khán bệnh",
    type: "Cụm động-tân", breakdown: "看 là xem, khám + 病 là bệnh.",
    origin: "Tùy chủ thể, cụm từ có thể chỉ bệnh nhân đi khám hoặc bác sĩ khám chữa bệnh.",
    mnemonic: "Nhìn và kiểm tra 看 căn bệnh 病: khám bệnh.",
    sentence: ["我不舒服，想去医院看病。", "Wǒ bù shūfu, xiǎng qù yīyuàn kànbìng.", "Tôi không khỏe, muốn đến bệnh viện khám bệnh."],
    sourceChar: "看",
    phraseAnalysis: {
      structure: "Động từ 看 “xem, kiểm tra” + tân ngữ 病 “bệnh”.",
      grammar: "Khi chủ thể là bệnh nhân, 看病 thường có nghĩa “đi khám, đi chữa bệnh”. Khi chủ thể là bác sĩ, nó có thể nghĩa là “khám bệnh cho bệnh nhân”. Ngữ cảnh quyết định cách dịch.",
      characters: [
        { hanzi: "看", pinyin: "kàn", type: "Chữ hình thanh", origin: "目 “mắt” là phần gợi nghĩa; phần hình thể còn lại liên hệ với 倝 và gợi âm trong lịch sử. Cách nhìn nét trên như bàn tay che mắt là một mẹo nhớ trực quan, không nên coi là kết luận nguồn gốc duy nhất.", memory: "Đặt bàn tay trên mắt để nhìn xa: xem, nhìn. Đây là mẹo nhớ.", source: "看" },
        { hanzi: "病", pinyin: "bìng", type: "Chữ hình thanh", origin: "疒 gợi nghĩa bệnh tật; 丙 bǐng gợi âm. 丙 không tạo nghĩa “sốt nóng” cho chữ 病.", memory: "Thấy bộ 疒 như người bệnh tựa vào giường, nghĩ ngay đến ốm đau.", source: "病" }
      ],
      extensions: [["医院", "yīyuàn", "bệnh viện"], ["病人", "bìngrén", "bệnh nhân"], ["看医生", "kàn yīsheng", "đi gặp bác sĩ"]]
    }
  }
];

const questionGuides = [
  {
    id: "shei", hanzi: "谁", pinyin: "shéi", meaning: "ai", group: "question",
    pattern: "谁 + động từ? / ... + 是谁?",
    usage: "Hỏi về người. 谁 đứng đúng vị trí mà tên người sẽ xuất hiện trong câu trả lời; không cần đảo lên đầu câu.",
    contrast: "他是老师 → 谁是老师？ | 他是王老师 → 他是谁？",
    examples: [["谁是你的老师？", "Shéi shì nǐ de lǎoshī?", "Ai là giáo viên của bạn?"], ["这是谁？", "Zhè shì shéi?", "Đây là ai?"]]
  },
  {
    id: "shenme", hanzi: "什么", pinyin: "shénme", meaning: "gì; cái gì", group: "question",
    pattern: "động từ + 什么? / 什么 + danh từ?",
    usage: "Hỏi sự vật, hành động hoặc loại sự vật. 什么 có thể đứng sau động từ hoặc đứng trước danh từ.",
    contrast: "吃米饭 → 吃什么？ | 汉语书 → 什么书？",
    examples: [["你想喝什么？", "Nǐ xiǎng hē shénme?", "Bạn muốn uống gì?"], ["这是什么书？", "Zhè shì shénme shū?", "Đây là sách gì?"]]
  },
  {
    id: "na", hanzi: "哪", pinyin: "nǎ", meaning: "nào", group: "question",
    pattern: "哪 + lượng từ + danh từ?",
    usage: "Hỏi lựa chọn trong một nhóm. Trước danh từ đếm được, 哪 thường cần lượng từ: 哪个人, 哪本书, 哪个学校.",
    contrast: "哪 hỏi “nào”; 那 nà thanh 4 nghĩa là “kia”. Dấu thanh quyết định hoàn toàn ý nghĩa.",
    examples: [["你喜欢哪本书？", "Nǐ xǐhuan nǎ běn shū?", "Bạn thích quyển sách nào?"], ["你在哪个学校学习？", "Nǐ zài nǎ ge xuéxiào xuéxí?", "Bạn học ở trường nào?"]]
  },
  {
    id: "nage-question", hanzi: "哪个", pinyin: "nǎge", meaning: "cái nào; người nào", group: "question",
    pattern: "哪个 + danh từ? / 哪个 đứng độc lập",
    usage: "哪 kết hợp lượng từ 个 thành 哪个. Có thể dùng riêng khi danh từ đã rõ, hoặc đặt trước danh từ.",
    contrast: "哪个 nǎge “cái nào” khác 那个 nàge “cái kia”.",
    examples: [["哪个是你的？", "Nǎge shì nǐ de?", "Cái nào là của bạn?"], ["你要哪个杯子？", "Nǐ yào nǎge bēizi?", "Bạn muốn cái cốc nào?"]]
  },
  {
    id: "nar", hanzi: "哪儿 / 哪里", pinyin: "nǎr / nǎlǐ", meaning: "đâu; ở đâu", group: "question",
    pattern: "在哪儿? / 去哪里? / 从哪儿来?",
    usage: "Hai dạng cùng nghĩa. 哪儿 phổ biến trong khẩu ngữ miền Bắc; 哪里 trung tính và dùng rộng hơn. Đặt chúng tại vị trí của địa điểm cần hỏi.",
    contrast: "我住在河内 → 你住在哪儿？ Không cần chuyển từ hỏi lên đầu câu.",
    examples: [["你住在哪里？", "Nǐ zhù zài nǎlǐ?", "Bạn sống ở đâu?"], ["你去哪儿？", "Nǐ qù nǎr?", "Bạn đi đâu?"]]
  },
  {
    id: "ji", hanzi: "几", pinyin: "jǐ", meaning: "mấy; bao nhiêu", group: "question",
    pattern: "几 + lượng từ + danh từ?",
    usage: "Hỏi số lượng tương đối nhỏ hoặc khi người nói dự đoán câu trả lời không lớn. Thường phải có lượng từ sau 几.",
    contrast: "几个人, 几本书. Với tuổi trẻ em và giờ giấc: 几岁, 几点.",
    examples: [["你家有几口人？", "Nǐ jiā yǒu jǐ kǒu rén?", "Gia đình bạn có mấy người?"], ["现在几点？", "Xiànzài jǐ diǎn?", "Bây giờ là mấy giờ?"]]
  },
  {
    id: "duoshao", hanzi: "多少", pinyin: "duōshao", meaning: "bao nhiêu", group: "question",
    pattern: "多少 + (lượng từ) + danh từ?",
    usage: "Hỏi số lượng hoặc giá tiền khi chưa biết phạm vi, thường dùng cho con số lớn hơn. Lượng từ có thể xuất hiện nhưng thường được lược trong nhiều cụm quen thuộc.",
    contrast: "多少人, 多少钱, 多少本书. 几 thường chờ số nhỏ; 多少 không đặt giới hạn như vậy.",
    examples: [["这个多少钱？", "Zhège duōshao qián?", "Cái này bao nhiêu tiền?"], ["你们学校有多少学生？", "Nǐmen xuéxiào yǒu duōshao xuésheng?", "Trường bạn có bao nhiêu học sinh?"]]
  },
  {
    id: "zenme", hanzi: "怎么", pinyin: "zěnme", meaning: "làm sao; bằng cách nào", group: "question",
    pattern: "怎么 + động từ?",
    usage: "Hỏi phương thức thực hiện. Trong 怎么了 hoặc 怎么不..., từ này cũng có thể hỏi nguyên nhân hay tình trạng bất thường.",
    contrast: "怎么 hỏi cách làm; 怎么样 hỏi đánh giá hoặc trạng thái “thế nào”.",
    examples: [["你怎么去学校？", "Nǐ zěnme qù xuéxiào?", "Bạn đi đến trường bằng cách nào?"], ["你怎么了？", "Nǐ zěnme le?", "Bạn làm sao vậy?"]]
  },
  {
    id: "zenmeyang", hanzi: "怎么样", pinyin: "zěnmeyàng", meaning: "thế nào", group: "question",
    pattern: "danh từ / sự việc + 怎么样?",
    usage: "Hỏi nhận xét, chất lượng, tình trạng hoặc ý kiến về một người hay sự việc.",
    contrast: "怎么去 “đi bằng cách nào”; 天气怎么样 “thời tiết thế nào”.",
    examples: [["今天天气怎么样？", "Jīntiān tiānqì zěnmeyàng?", "Hôm nay thời tiết thế nào?"], ["这个办法怎么样？", "Zhège bànfǎ zěnmeyàng?", "Cách này thế nào?"]]
  },
  {
    id: "weishenme", hanzi: "为什么", pinyin: "wèishénme", meaning: "tại sao", group: "question",
    pattern: "chủ ngữ + 为什么 + động từ / tính từ?",
    usage: "Hỏi nguyên nhân hoặc lý do. Câu trả lời thường dùng 因为 yīnwèi “bởi vì”.",
    contrast: "为什么 hỏi lý do; 怎么 hỏi cách thức hoặc tình trạng trong một số mẫu cố định.",
    examples: [["你为什么学中文？", "Nǐ wèishénme xué Zhōngwén?", "Tại sao bạn học tiếng Trung?"], ["因为我喜欢中国文化。", "Yīnwèi wǒ xǐhuan Zhōngguó wénhuà.", "Vì tôi thích văn hóa Trung Quốc."]]
  },
  {
    id: "shenmeshihou", hanzi: "什么时候", pinyin: "shénme shíhou", meaning: "khi nào", group: "question",
    pattern: "chủ ngữ + 什么时候 + động từ?",
    usage: "Hỏi thời điểm. Cụm này đứng tại vị trí mà từ chỉ thời gian như 明天, 三点 sẽ xuất hiện trong câu trả lời.",
    contrast: "我明天回家 → 你什么时候回家？",
    examples: [["你什么时候回家？", "Nǐ shénme shíhou huíjiā?", "Khi nào bạn về nhà?"], ["我明天下午回家。", "Wǒ míngtiān xiàwǔ huíjiā.", "Chiều mai tôi về nhà."]]
  },
  {
    id: "ma", hanzi: "吗", pinyin: "ma", meaning: "không?; à?", group: "particle",
    pattern: "câu kể + 吗?",
    usage: "Đặt 吗 ở cuối một câu kể để tạo câu hỏi có/không. 吗 đọc thanh nhẹ và không dùng cùng từ để hỏi như 谁, 什么, 哪儿.",
    contrast: "你是学生。→ 你是学生吗？ Không nói 你是谁吗？ vì 谁 đã làm câu trở thành câu hỏi.",
    examples: [["你是学生吗？", "Nǐ shì xuésheng ma?", "Bạn là học sinh phải không?"], ["你喜欢喝茶吗？", "Nǐ xǐhuan hē chá ma?", "Bạn có thích uống trà không?"]]
  },
  {
    id: "ne", hanzi: "呢", pinyin: "ne", meaning: "còn... thì sao?", group: "particle",
    pattern: "danh từ / đại từ + 呢?",
    usage: "Dùng để hỏi lại cùng một chủ đề hoặc hỏi vị trí, tình trạng đã rõ trong ngữ cảnh. 呢 đọc thanh nhẹ.",
    contrast: "我是越南人，你呢？ nghĩa là “Tôi là người Việt Nam, còn bạn?”. 呢 phụ thuộc nhiều vào ngữ cảnh phía trước.",
    examples: [["我很好，你呢？", "Wǒ hěn hǎo, nǐ ne?", "Tôi khỏe, còn bạn?"], ["我的手机呢？", "Wǒ de shǒujī ne?", "Điện thoại của tôi đâu rồi?"]]
  },
  {
    id: "haishi", hanzi: "还是", pinyin: "háishi", meaning: "hay là", group: "particle",
    pattern: "A 还是 B?",
    usage: "Dùng trong câu hỏi lựa chọn giữa hai hoặc nhiều phương án. Người trả lời chọn một phương án, không chỉ trả lời có hoặc không.",
    contrast: "Câu hỏi dùng 还是; câu kể “hoặc” thường dùng 或者 huòzhě.",
    examples: [["你喝茶还是咖啡？", "Nǐ hē chá háishi kāfēi?", "Bạn uống trà hay cà phê?"], ["你坐车还是走路？", "Nǐ zuò chē háishi zǒulù?", "Bạn đi xe hay đi bộ?"]]
  },
  {
    id: "naxie", hanzi: "哪些", pinyin: "nǎxiē", meaning: "những... nào", group: "question",
    pattern: "哪些 + danh từ? / 哪些 đứng độc lập",
    usage: "Hỏi lựa chọn số nhiều. 些 là lượng từ chỉ một số, vài; 哪些 có thể đứng trước danh từ hoặc đứng riêng khi danh từ đã rõ.",
    contrast: "哪个 hỏi một lựa chọn; 哪些 hỏi nhiều lựa chọn.",
    examples: [["你喜欢哪些水果？", "Nǐ xǐhuan nǎxiē shuǐguǒ?", "Bạn thích những loại trái cây nào?"], ["哪些是你的书？", "Nǎxiē shì nǐ de shū?", "Những quyển nào là sách của bạn?"]]
  },
  {
    id: "duoda", hanzi: "多大", pinyin: "duō dà", meaning: "bao nhiêu tuổi; lớn cỡ nào", group: "question",
    pattern: "người / vật + 多大?",
    usage: "Với người, 多大 thường hỏi tuổi. Với vật hoặc địa điểm, nó hỏi kích thước hay mức độ lớn tùy ngữ cảnh.",
    contrast: "你多大？ thường hỏi tuổi trong giao tiếp. Hỏi tuổi người lớn lịch sự hơn có thể dùng 您多大年纪？",
    examples: [["你今年多大？", "Nǐ jīnnián duō dà?", "Năm nay bạn bao nhiêu tuổi?"], ["这个房间有多大？", "Zhège fángjiān yǒu duō dà?", "Căn phòng này rộng cỡ nào?"]]
  },
  {
    id: "duojiu", hanzi: "多久", pinyin: "duō jiǔ", meaning: "bao lâu", group: "question",
    pattern: "động từ + 多久? / 多久 + động từ?",
    usage: "Hỏi khoảng thời gian kéo dài. Câu trả lời thường là 三天, 半年, 两个小时, v.v.",
    contrast: "什么时候 hỏi thời điểm; 多久 hỏi thời lượng. 明天 là thời điểm, 三天 là khoảng thời gian.",
    examples: [["你学中文多久了？", "Nǐ xué Zhōngwén duō jiǔ le?", "Bạn học tiếng Trung được bao lâu rồi?"], ["我们要等多久？", "Wǒmen yào děng duō jiǔ?", "Chúng ta phải đợi bao lâu?"]]
  },
  {
    id: "duoyuan", hanzi: "多远", pinyin: "duō yuǎn", meaning: "bao xa", group: "question",
    pattern: "A 离 B 多远?",
    usage: "Hỏi khoảng cách giữa hai nơi. Mẫu rất hay gặp là địa điểm A + 离 + địa điểm B + 多远.",
    contrast: "多远 hỏi khoảng cách; 多久 hỏi thời lượng di chuyển hoặc chờ đợi.",
    examples: [["学校离你家多远？", "Xuéxiào lí nǐ jiā duō yuǎn?", "Trường cách nhà bạn bao xa?"], ["从这里到车站有多远？", "Cóng zhèlǐ dào chēzhàn yǒu duō yuǎn?", "Từ đây đến nhà ga bao xa?"]]
  },
  {
    id: "zhe", hanzi: "这", pinyin: "zhè", meaning: "đây; này; this", group: "demonstrative",
    pattern: "这是... / 这 + lượng từ + danh từ",
    usage: "Chỉ người hoặc vật gần người nói. Khi đứng trước danh từ đếm được, thường phải thêm lượng từ.",
    contrast: "这本书 “quyển sách này”; không nói 这书 trong cách nói cơ bản có chủ ý đếm một vật.",
    examples: [["这是我的书。", "Zhè shì wǒ de shū.", "Đây là sách của tôi."], ["这本书很好。", "Zhè běn shū hěn hǎo.", "Quyển sách này rất hay."]]
  },
  {
    id: "zhege", hanzi: "这个", pinyin: "zhège", meaning: "cái này; this one", group: "demonstrative",
    pattern: "这个 + danh từ / 这个 đứng độc lập",
    usage: "这 + lượng từ phổ biến 个. Dùng cho một vật hoặc người gần; có thể đứng riêng khi danh từ đã rõ.",
    contrast: "这个人 “người này”; 我要这个 “tôi muốn cái này”.",
    examples: [["这个人是我同事。", "Zhège rén shì wǒ tóngshì.", "Người này là đồng nghiệp của tôi."], ["我要这个。", "Wǒ yào zhège.", "Tôi muốn cái này."]]
  },
  {
    id: "na-that", hanzi: "那", pinyin: "nà", meaning: "kia; đó; that", group: "demonstrative",
    pattern: "那是... / 那 + lượng từ + danh từ",
    usage: "Chỉ người hoặc vật xa người nói, hoặc điều vừa được nhắc tới. Trước danh từ đếm được thường có lượng từ.",
    contrast: "那 nà thanh 4 “kia” khác 哪 nǎ thanh 3 “nào”.",
    examples: [["那是我的学校。", "Nà shì wǒ de xuéxiào.", "Kia là trường của tôi."], ["那辆车很贵。", "Nà liàng chē hěn guì.", "Chiếc xe kia rất đắt."]]
  },
  {
    id: "nage-that", hanzi: "那个", pinyin: "nàge", meaning: "cái kia; that one", group: "demonstrative",
    pattern: "那个 + danh từ / 那个 đứng độc lập",
    usage: "那 + lượng từ 个. Trong khẩu ngữ, 那个 thường được đọc gần như nèige; giao diện vẫn ghi dạng chuẩn nàge.",
    contrast: "那个 nàge “cái kia” khác 哪个 nǎge “cái nào”.",
    examples: [["那个人是谁？", "Nàge rén shì shéi?", "Người kia là ai?"], ["我不要那个。", "Wǒ bú yào nàge.", "Tôi không muốn cái kia."]]
  },
  {
    id: "zheli", hanzi: "这里 / 这儿", pinyin: "zhèlǐ / zhèr", meaning: "đây; ở đây; here", group: "demonstrative",
    pattern: "在这里 / 到这儿来",
    usage: "Chỉ địa điểm gần người nói. 这儿 phổ biến trong khẩu ngữ miền Bắc; 这里 trung tính và dùng rộng hơn.",
    contrast: "这 chỉ vật hoặc điều gần; 这里/这儿 chỉ địa điểm gần.",
    examples: [["我住在这里。", "Wǒ zhù zài zhèlǐ.", "Tôi sống ở đây."], ["请到这儿来。", "Qǐng dào zhèr lái.", "Mời đến đây."]]
  },
  {
    id: "nali", hanzi: "那里 / 那儿", pinyin: "nàlǐ / nàr", meaning: "kia; ở đó; there", group: "demonstrative",
    pattern: "在那里 / 去那儿",
    usage: "Chỉ địa điểm xa người nói. 那儿 là dạng âm hóa er thường nghe ở miền Bắc; 那里 dùng rộng hơn.",
    contrast: "那 chỉ vật hoặc điều xa; 那里/那儿 chỉ địa điểm xa.",
    examples: [["洗手间在那里。", "Xǐshǒujiān zài nàlǐ.", "Nhà vệ sinh ở đằng kia."], ["我们去那儿吧。", "Wǒmen qù nàr ba.", "Chúng ta đến đó nhé."]]
  }
];

const topicWorkshopData = [
  {
    id: "family",
    label: "Gia đình & quan hệ",
    shortLabel: "Quan hệ",
    sceneHanzi: "家",
    sceneTitle: "Một mái nhà có người thân và bạn bè ghé qua",
    sceneNote: "Nhìn chủ đề này như một bản đồ quanh bạn: trong nhà là 家, ra ngoài gặp 朋友, 同学, 同事.",
    chunks: [
      ["我家有 + số + 口人", "nói nhà có mấy người", "我家有四口人。"],
      ["这是我的 + người", "giới thiệu người thân", "这是我的妈妈。"],
      ["我有一个 + quan hệ", "nói mình có ai đó", "我有一个室友。"]
    ],
    words: [
      { hanzi: "家", pinyin: "jiā", meaning: "nhà; gia đình", visual: "mái nhà", memory: "Tưởng tượng chữ 家 là một mái nhà đang giữ cả gia đình bên trong.", chunk: "我家有...", sentence: ["我家有四口人。", "Wǒ jiā yǒu sì kǒu rén.", "Nhà tôi có bốn người."] },
      { hanzi: "妈妈", pinyin: "māma", meaning: "mẹ", visual: "người gọi bạn ăn cơm", memory: "Âm māma mềm và sáng, giống tiếng gọi thân quen trong nhà.", chunk: "这是我的妈妈", sentence: ["这是我的妈妈。", "Zhè shì wǒ de māma.", "Đây là mẹ tôi."] },
      { hanzi: "朋友", pinyin: "péngyou", meaning: "bạn bè", visual: "hai người đi cạnh nhau", memory: "朋友 là người đi cùng mình trong câu chuyện hằng ngày.", chunk: "我的朋友", sentence: ["他是我的朋友。", "Tā shì wǒ de péngyou.", "Anh ấy là bạn của tôi."] },
      { hanzi: "同学", pinyin: "tóngxué", meaning: "bạn học", visual: "cùng bàn học", memory: "同 là cùng, 学 là học: cùng học thì thành 同学.", chunk: "我的同学", sentence: ["她是我的同学。", "Tā shì wǒ de tóngxué.", "Cô ấy là bạn học của tôi."] },
      { hanzi: "同事", pinyin: "tóngshì", meaning: "đồng nghiệp", visual: "cùng làm một việc", memory: "同 là cùng, 事 là việc: cùng việc thì là 同事.", chunk: "一个同事", sentence: ["他是我的同事。", "Tā shì wǒ de tóngshì.", "Anh ấy là đồng nghiệp của tôi."] },
      { hanzi: "邻居", pinyin: "línjū", meaning: "hàng xóm", visual: "hai nhà sát nhau", memory: "Hãy tưởng tượng hai cánh cửa gần nhau: mở cửa ra là gặp 邻居.", chunk: "我的邻居", sentence: ["我的邻居很好。", "Wǒ de línjū hěn hǎo.", "Hàng xóm của tôi rất tốt."] },
      { hanzi: "室友", pinyin: "shìyǒu", meaning: "bạn cùng phòng", visual: "cùng một căn phòng", memory: "室 là phòng, 友 là bạn: bạn trong cùng phòng là 室友.", chunk: "一个室友", sentence: ["我有一个室友。", "Wǒ yǒu yí ge shìyǒu.", "Tôi có một bạn cùng phòng."] },
      { hanzi: "网友", pinyin: "wǎngyǒu", meaning: "bạn trên mạng", visual: "mạng lưới nối tới bạn", memory: "网 là mạng, 友 là bạn: người bạn nối qua mạng là 网友.", chunk: "一个网友", sentence: ["我有一个中国网友。", "Wǒ yǒu yí ge Zhōngguó wǎngyǒu.", "Tôi có một bạn Trung Quốc quen trên mạng."] }
    ],
    drills: [
      { prompt: "这是我的____。", answer: "妈妈", meaning: "Đây là mẹ tôi.", options: ["妈妈", "商店", "茶", "出租车"] },
      { prompt: "他是我的____。", answer: "同事", meaning: "Anh ấy là đồng nghiệp của tôi.", options: ["同事", "米饭", "学校", "今天"] },
      { prompt: "我有一个____。", answer: "室友", meaning: "Tôi có một bạn cùng phòng.", options: ["室友", "车", "菜", "点"] }
    ]
  },
  {
    id: "food",
    label: "Ăn uống",
    shortLabel: "Ăn uống",
    sceneHanzi: "口",
    sceneTitle: "Miệng đọc bài, bụng nhớ từ nhanh hơn",
    sceneNote: "Chủ đề ăn uống nên học theo cụm động từ: 吃 + món, 喝 + đồ uống, 想 + ăn/uống.",
    chunks: [
      ["吃 + món ăn", "ăn món gì", "我吃米饭。"],
      ["喝 + đồ uống", "uống gì", "我喝茶。"],
      ["想 + ăn/uống", "muốn dùng gì", "我想喝水。"]
    ],
    words: [
      { hanzi: "吃饭", pinyin: "chīfàn", meaning: "ăn cơm; ăn bữa", visual: "miệng + bữa ăn", memory: "吃 là ăn, 饭 là bữa/cơm: ghép lại thành hành động ăn một bữa.", chunk: "去吃饭", sentence: ["我们去吃饭吧。", "Wǒmen qù chīfàn ba.", "Chúng ta đi ăn nhé."] },
      { hanzi: "喝水", pinyin: "hē shuǐ", meaning: "uống nước", visual: "miệng bên ly nước", memory: "喝 có miệng 口: cứ thấy 口 là nhớ hành động qua miệng.", chunk: "想喝水", sentence: ["我想喝水。", "Wǒ xiǎng hē shuǐ.", "Tôi muốn uống nước."] },
      { hanzi: "茶", pinyin: "chá", meaning: "trà", visual: "lá trà trên bàn", memory: "Hãy đặt chữ 茶 lên tách trà nóng: nhìn chữ là nhớ mùi trà.", chunk: "喝茶", sentence: ["你想喝茶吗？", "Nǐ xiǎng hē chá ma?", "Bạn muốn uống trà không?"] },
      { hanzi: "米饭", pinyin: "mǐfàn", meaning: "cơm", visual: "hạt gạo thành bát cơm", memory: "米 là gạo, 饭 là cơm/bữa ăn: 米饭 là cơm trắng.", chunk: "吃米饭", sentence: ["我喜欢吃米饭。", "Wǒ xǐhuan chī mǐfàn.", "Tôi thích ăn cơm."] },
      { hanzi: "面包", pinyin: "miànbāo", meaning: "bánh mì", visual: "ổ bánh nằm trong túi", memory: "面 là bột/mì, 包 là bọc lại: tưởng tượng ổ bánh được bọc thơm phức.", chunk: "买面包", sentence: ["我买一个面包。", "Wǒ mǎi yí ge miànbāo.", "Tôi mua một cái bánh mì."] },
      { hanzi: "水果", pinyin: "shuǐguǒ", meaning: "trái cây", visual: "nước ngọt trong quả", memory: "水 là nước, 果 là quả: quả mọng nước là 水果.", chunk: "吃水果", sentence: ["我每天吃水果。", "Wǒ měitiān chī shuǐguǒ.", "Tôi ăn trái cây mỗi ngày."] },
      { hanzi: "菜", pinyin: "cài", meaning: "món ăn; rau", visual: "đĩa rau trên bàn", memory: "菜 là món trên bàn ăn, nhất là rau hoặc đồ ăn đã nấu.", chunk: "中国菜", sentence: ["我喜欢中国菜。", "Wǒ xǐhuan Zhōngguó cài.", "Tôi thích món Trung Quốc."] },
      { hanzi: "饭店", pinyin: "fàndiàn", meaning: "nhà hàng", visual: "nơi bán bữa ăn", memory: "饭 là bữa ăn, 店 là cửa tiệm: tiệm ăn là 饭店.", chunk: "去饭店", sentence: ["我们去饭店吃饭。", "Wǒmen qù fàndiàn chīfàn.", "Chúng ta đến nhà hàng ăn cơm."] }
    ],
    drills: [
      { prompt: "我喜欢吃____。", answer: "米饭", meaning: "Tôi thích ăn cơm.", options: ["米饭", "同事", "学校", "现在"] },
      { prompt: "你想喝____吗？", answer: "茶", meaning: "Bạn muốn uống trà không?", options: ["茶", "出租车", "同学", "点"] },
      { prompt: "我们去____吃饭。", answer: "饭店", meaning: "Chúng ta đến nhà hàng ăn cơm.", options: ["饭店", "妈妈", "今天", "书"] }
    ]
  },
  {
    id: "study",
    label: "Học tập",
    shortLabel: "Học tập",
    sceneHanzi: "学",
    sceneTitle: "Bàn học nhỏ, câu nói dùng được ngay",
    sceneNote: "Chủ đề học tập nên học theo vai: ai học, học ở đâu, học môn gì, ai là giáo viên.",
    chunks: [
      ["在 + nơi + 学习", "học ở đâu", "我在学校学习。"],
      ["学 + môn/ngôn ngữ", "học cái gì", "我学汉语。"],
      ["是 + vai trò", "là học sinh/giáo viên", "我是学生。"]
    ],
    words: [
      { hanzi: "学校", pinyin: "xuéxiào", meaning: "trường học", visual: "cổng trường", memory: "学 là học, 校 là trường: nơi để học là 学校.", chunk: "在学校", sentence: ["我在学校学习。", "Wǒ zài xuéxiào xuéxí.", "Tôi học ở trường."] },
      { hanzi: "学生", pinyin: "xuésheng", meaning: "học sinh", visual: "người đang học", memory: "学 là học, 生 là người/sinh ra: người đang học là 学生.", chunk: "我是学生", sentence: ["我是学生。", "Wǒ shì xuésheng.", "Tôi là học sinh."] },
      { hanzi: "老师", pinyin: "lǎoshī", meaning: "giáo viên", visual: "người dẫn đường trên bảng", memory: "老 gợi người lớn tuổi/kinh nghiệm, 师 là thầy: 老师 là thầy cô.", chunk: "我的老师", sentence: ["她是我的老师。", "Tā shì wǒ de lǎoshī.", "Cô ấy là giáo viên của tôi."] },
      { hanzi: "学习", pinyin: "xuéxí", meaning: "học tập", visual: "học rồi luyện lại", memory: "学 là học, 习 là luyện: học mà có luyện là 学习.", chunk: "学习汉语", sentence: ["我学习汉语。", "Wǒ xuéxí Hànyǔ.", "Tôi học tiếng Trung."] },
      { hanzi: "汉语", pinyin: "Hànyǔ", meaning: "tiếng Trung", visual: "ngôn ngữ của người Hán", memory: "汉 gắn với Trung Hoa, 语 là ngôn ngữ: 汉语 là tiếng Trung.", chunk: "说汉语", sentence: ["我会说一点儿汉语。", "Wǒ huì shuō yìdiǎnr Hànyǔ.", "Tôi biết nói một chút tiếng Trung."] },
      { hanzi: "书", pinyin: "shū", meaning: "sách", visual: "cuốn sách mở", memory: "Nhìn 书 như một cuốn sách gập nét, mở ra là có bài học.", chunk: "看书", sentence: ["我喜欢看书。", "Wǒ xǐhuan kàn shū.", "Tôi thích đọc sách."] },
      { hanzi: "写字", pinyin: "xiě zì", meaning: "viết chữ", visual: "tay viết chữ", memory: "写 là viết, 字 là chữ: 写字 là viết chữ.", chunk: "写汉字", sentence: ["我会写汉字。", "Wǒ huì xiě Hànzì.", "Tôi biết viết chữ Hán."] },
      { hanzi: "读书", pinyin: "dúshū", meaning: "đọc sách; đi học", visual: "đọc thành tiếng", memory: "读 là đọc, 书 là sách: cầm sách lên đọc là 读书.", chunk: "喜欢读书", sentence: ["他喜欢读书。", "Tā xǐhuan dúshū.", "Anh ấy thích đọc sách."] }
    ],
    drills: [
      { prompt: "我在____学习。", answer: "学校", meaning: "Tôi học ở trường.", options: ["学校", "面包", "邻居", "出租车"] },
      { prompt: "我是____。", answer: "学生", meaning: "Tôi là học sinh.", options: ["学生", "茶", "今天", "商店"] },
      { prompt: "我学习____。", answer: "汉语", meaning: "Tôi học tiếng Trung.", options: ["汉语", "米饭", "朋友", "车"] }
    ]
  },
  {
    id: "go",
    label: "Đi lại & địa điểm",
    shortLabel: "Đi lại",
    sceneHanzi: "车",
    sceneTitle: "Từ mới lên xe, chạy thẳng vào câu",
    sceneNote: "Học nhóm này theo đường đi: đi đâu, bằng gì, ở phía nào, mua ở đâu.",
    chunks: [
      ["去 + nơi", "đi đến đâu", "我去学校。"],
      ["坐 + phương tiện", "đi bằng gì", "我坐公共汽车。"],
      ["在 + phía/nơi", "ở đâu", "商店在前面。"]
    ],
    words: [
      { hanzi: "去", pinyin: "qù", meaning: "đi", visual: "mũi tên đi ra", memory: "去 là rời chỗ hiện tại để đi tới nơi khác.", chunk: "去学校", sentence: ["我去学校。", "Wǒ qù xuéxiào.", "Tôi đi đến trường."] },
      { hanzi: "回家", pinyin: "huí jiā", meaning: "về nhà", visual: "mũi tên quay về mái nhà", memory: "回 là quay lại, 家 là nhà: quay về nhà là 回家.", chunk: "想回家", sentence: ["我想回家。", "Wǒ xiǎng huí jiā.", "Tôi muốn về nhà."] },
      { hanzi: "坐", pinyin: "zuò", meaning: "ngồi; đi bằng", visual: "ngồi lên xe", memory: "Trong đi lại, 坐 dùng như 'đi bằng': 坐车, 坐公共汽车.", chunk: "坐车", sentence: ["我坐车去学校。", "Wǒ zuò chē qù xuéxiào.", "Tôi đi xe đến trường."] },
      { hanzi: "车", pinyin: "chē", meaning: "xe", visual: "bánh xe trên đường", memory: "车 là xe nói chung, đứng riêng hoặc ghép với nhiều phương tiện.", chunk: "一辆车", sentence: ["这辆车很贵。", "Zhè liàng chē hěn guì.", "Chiếc xe này rất đắt."] },
      { hanzi: "出租车", pinyin: "chūzūchē", meaning: "taxi", visual: "xe thuê chạy tới", memory: "出租 là cho thuê, 车 là xe: xe thuê theo chuyến là 出租车.", chunk: "坐出租车", sentence: ["我坐出租车去饭店。", "Wǒ zuò chūzūchē qù fàndiàn.", "Tôi đi taxi đến nhà hàng."] },
      { hanzi: "公共汽车", pinyin: "gōnggòng qìchē", meaning: "xe buýt", visual: "xe chung cho mọi người", memory: "公共 là công cộng, 汽车 là ô tô: xe công cộng là xe buýt.", chunk: "坐公共汽车", sentence: ["我坐公共汽车去学校。", "Wǒ zuò gōnggòng qìchē qù xuéxiào.", "Tôi đi xe buýt đến trường."] },
      { hanzi: "商店", pinyin: "shāngdiàn", meaning: "cửa hàng", visual: "mặt tiền bán đồ", memory: "商 gợi buôn bán, 店 là cửa tiệm: 商店 là cửa hàng.", chunk: "去商店", sentence: ["我去商店买东西。", "Wǒ qù shāngdiàn mǎi dōngxi.", "Tôi đến cửa hàng mua đồ."] },
      { hanzi: "前面", pinyin: "qiánmiàn", meaning: "phía trước", visual: "mũi tên trước mặt", memory: "前 là trước, 面 là mặt/phía: phía trước mặt là 前面.", chunk: "在前面", sentence: ["商店在前面。", "Shāngdiàn zài qiánmiàn.", "Cửa hàng ở phía trước."] }
    ],
    drills: [
      { prompt: "我____学校。", answer: "去", meaning: "Tôi đi đến trường.", options: ["去", "茶", "妈妈", "读书"] },
      { prompt: "我坐____去饭店。", answer: "出租车", meaning: "Tôi đi taxi đến nhà hàng.", options: ["出租车", "老师", "米饭", "今天"] },
      { prompt: "商店在____。", answer: "前面", meaning: "Cửa hàng ở phía trước.", options: ["前面", "朋友", "汉语", "面包"] }
    ]
  },
  {
    id: "time",
    label: "Thời gian & sinh hoạt",
    shortLabel: "Thời gian",
    sceneHanzi: "日",
    sceneTitle: "Một ngày nhỏ, nhiều câu nói được ngay",
    sceneNote: "Nhóm này nên học theo trục thời gian: hôm nay, bây giờ, mấy giờ, làm gì.",
    chunks: [
      ["今天/明天 + hành động", "nói ngày nào làm gì", "我明天去学校。"],
      ["现在 + thời gian/hành động", "nói hiện tại", "现在三点。"],
      ["mấy giờ + làm gì", "kể lịch sinh hoạt", "我七点起床。"]
    ],
    words: [
      { hanzi: "今天", pinyin: "jīntiān", meaning: "hôm nay", visual: "ngày đang mở ra", memory: "今 là hiện tại, 天 là ngày: ngày hiện tại là 今天.", chunk: "今天 + ...", sentence: ["今天星期五。", "Jīntiān xīngqīwǔ.", "Hôm nay là thứ Sáu."] },
      { hanzi: "明天", pinyin: "míngtiān", meaning: "ngày mai", visual: "ngày sáng phía trước", memory: "明 có ánh sáng, 天 là ngày: ngày sáng phía trước là 明天.", chunk: "明天去", sentence: ["我明天去中国。", "Wǒ míngtiān qù Zhōngguó.", "Ngày mai tôi đi Trung Quốc."] },
      { hanzi: "现在", pinyin: "xiànzài", meaning: "bây giờ", visual: "điểm đang đứng", memory: "现在 là khoảnh khắc đang diễn ra: đặt nó ở đầu câu để kéo cả câu về hiện tại.", chunk: "现在 + ...", sentence: ["现在三点。", "Xiànzài sān diǎn.", "Bây giờ là ba giờ."] },
      { hanzi: "时候", pinyin: "shíhou", meaning: "lúc; thời điểm", visual: "một ô thời gian", memory: "什么时候 là 'khi nào'; thấy 时候 hãy nghĩ tới một mốc thời gian.", chunk: "什么时候", sentence: ["你什么时候回家？", "Nǐ shénme shíhou huí jiā?", "Khi nào bạn về nhà?"] },
      { hanzi: "点", pinyin: "diǎn", meaning: "giờ; điểm", visual: "chấm trên đồng hồ", memory: "点 là một điểm trên mặt đồng hồ: 三点 là ba giờ.", chunk: "三点", sentence: ["现在三点。", "Xiànzài sān diǎn.", "Bây giờ là ba giờ."] },
      { hanzi: "起床", pinyin: "qǐchuáng", meaning: "thức dậy", visual: "rời khỏi giường", memory: "起 là đứng dậy, 床 là giường: rời giường là 起床.", chunk: "七点起床", sentence: ["我七点起床。", "Wǒ qī diǎn qǐchuáng.", "Tôi thức dậy lúc bảy giờ."] },
      { hanzi: "睡觉", pinyin: "shuìjiào", meaning: "ngủ", visual: "đèn tắt bên giường", memory: "睡 là ngủ, 觉 là giấc: 睡觉 là đi ngủ/ngủ.", chunk: "晚上睡觉", sentence: ["我晚上睡觉。", "Wǒ wǎnshang shuìjiào.", "Tôi ngủ vào buổi tối."] },
      { hanzi: "下班", pinyin: "xiàbān", meaning: "tan làm", visual: "rời ca làm", memory: "下 là xuống/kết thúc, 班 là ca/lớp: hết ca là 下班.", chunk: "下班回家", sentence: ["我下班回家。", "Wǒ xiàbān huí jiā.", "Tôi tan làm rồi về nhà."] }
    ],
    drills: [
      { prompt: "____星期五。", answer: "今天", meaning: "Hôm nay là thứ Sáu.", options: ["今天", "茶", "室友", "出租车"] },
      { prompt: "我七点____。", answer: "起床", meaning: "Tôi thức dậy lúc bảy giờ.", options: ["起床", "面包", "老师", "商店"] },
      { prompt: "你____回家？", answer: "什么时候", meaning: "Khi nào bạn về nhà?", options: ["什么时候", "米饭", "朋友", "公共汽车"] }
    ]
  }
];

const topicOverviewDefinitions = [
  {
    id: "question",
    label: "Từ để hỏi & chỉ định",
    shortLabel: "Hỏi / chỉ",
    sceneHanzi: "哪",
    sceneTitle: "Nhóm từ hỏi đúng chỗ, chỉ đúng vật, mở câu rất nhanh",
    sceneNote: "Gom các từ kiểu ai, gì, nào, đâu, mấy, bao nhiêu, thế nào, this, that để bạn nhìn một lượt ra ngay cả nhóm.",
    words: ["谁", "什么", "哪", "哪个", "哪些", "哪儿", "哪里", "几", "多少", "怎么", "怎么样", "为什么", "什么时候", "吗", "呢", "还是", "这", "这个", "这里", "这儿", "那", "那个", "那里", "那儿", "每", "所有", "一起"],
    keywords: ["ai", "cai gi", "nao", "o dau", "the nao", "bao nhieu", "may", "khi nao", "tai sao", "day", "kia", "nay", "do"]
  },
  {
    id: "number",
    label: "Số đếm & số lượng",
    shortLabel: "Số lượng",
    sceneHanzi: "数",
    sceneTitle: "Đếm người, đếm món, hỏi số lượng và thời lượng cơ bản",
    sceneNote: "Nhóm này gom số đếm, lượng từ và những từ bạn gặp suốt khi nói tuổi, giờ, số tiền, số lần.",
    words: ["零", "一", "二", "两", "三", "四", "五", "六", "七", "八", "九", "十", "百", "千", "万", "半", "个", "口", "岁", "次", "点", "号", "分钟", "小时", "年", "月", "天", "多少", "几", "多"],
    keywords: ["mot", "hai", "ba", "bon", "nam", "sau", "bay", "tam", "chin", "muoi", "tram", "nghin", "van", "lan", "tuoi", "ruoi"]
  },
  {
    id: "time",
    label: "Thời gian & lịch",
    shortLabel: "Thời gian",
    sceneHanzi: "时",
    sceneTitle: "Một trục thời gian để kể hôm nay, ngày mai, sáng trưa tối",
    sceneNote: "Bấm vào đây để xem toàn bộ từ HSK 1-2 nói về giờ giấc, tuần, ngày tháng và nhịp sinh hoạt.",
    words: ["今天", "明天", "昨天", "现在", "时候", "时间", "星期", "周", "星期天", "星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "上午", "中午", "下午", "晚上", "早上", "早", "晚", "今年", "明年", "去年"],
    keywords: ["hom nay", "ngay mai", "hom qua", "bay gio", "luc", "buoi sang", "buoi trua", "buoi chieu", "buoi toi", "tuan", "nam truoc", "nam nay", "nam sau"]
  },
  {
    id: "family",
    label: "Gia đình & quan hệ",
    shortLabel: "Gia đình",
    sceneHanzi: "家",
    sceneTitle: "Những người quanh bạn: trong nhà, lớp học, chỗ làm và ngoài mạng",
    sceneNote: "Không chỉ người thân, nhóm này còn gom bạn học, đồng nghiệp, hàng xóm và các vai xã hội rất hay dùng.",
    words: ["家", "家庭", "家人", "爸爸", "妈妈", "哥哥", "姐姐", "弟弟", "妹妹", "儿子", "女儿", "孩子", "朋友", "同学", "老师", "学生", "同事", "邻居", "室友", "网友", "先生", "小姐", "客人", "男人", "女人", "人"],
    keywords: ["gia dinh", "me", "bo", "anh trai", "chi gai", "em trai", "em gai", "ban hoc", "ban be", "dong nghiep", "hang xom", "con trai", "con gai", "khach"]
  },
  {
    id: "school",
    label: "Học tập & ngôn ngữ",
    shortLabel: "Học tập",
    sceneHanzi: "学",
    sceneTitle: "Tất cả từ về trường lớp, học hành, đọc viết và ngôn ngữ",
    sceneNote: "Nếu bạn đang học để giao tiếp cơ bản, đây là một trong những chủ đề nên ôn đi ôn lại nhiều nhất.",
    words: ["学校", "大学", "大学生", "学生", "老师", "同学", "学习", "汉语", "中文", "英语", "语文", "字", "汉字", "名字", "姓名", "问题", "回答", "课", "考试", "作业", "书", "本子", "笔", "写", "看", "读", "听", "说"],
    keywords: ["hoc", "truong", "giao vien", "hoc sinh", "dai hoc", "ngon ngu", "viet chu", "doc sach", "bai hoc", "de thi", "tra loi"]
  },
  {
    id: "food",
    label: "Ăn uống",
    shortLabel: "Ăn uống",
    sceneHanzi: "吃",
    sceneTitle: "Món ăn, đồ uống và các từ dùng khi gọi món, hỏi khẩu vị",
    sceneNote: "Tập theo nhóm này sẽ kéo được rất nhiều câu giao tiếp đời thường: ăn gì, uống gì, thích món nào.",
    words: ["吃", "喝", "米饭", "面包", "包子", "饺子", "面条", "水果", "苹果", "香蕉", "菜", "肉", "鱼", "鸡蛋", "牛奶", "水", "茶", "咖啡", "饭店", "食堂", "米", "饭", "早餐", "午饭", "晚饭"],
    keywords: ["an", "uong", "com", "banh", "tra", "nuoc", "trai cay", "rau", "thit", "ca phe", "sua", "trung", "nha hang"]
  },
  {
    id: "shopping",
    label: "Mua sắm & tiền",
    shortLabel: "Mua sắm",
    sceneHanzi: "买",
    sceneTitle: "Mua, bán, giá cả và tiền nong trong HSK 1-2",
    sceneNote: "Nhóm này đặc biệt hữu ích để hỏi giá, mặc cả nhẹ, hoặc phản xạ nhanh khi thanh toán.",
    words: ["买", "卖", "东西", "钱", "块", "元", "多少", "便宜", "贵", "商店", "超市", "衣服", "颜色"],
    keywords: ["mua", "ban", "tien", "re", "dat", "gia", "cua hang", "sieu thi"]
  },
  {
    id: "travel",
    label: "Đi lại & phương tiện",
    shortLabel: "Đi lại",
    sceneHanzi: "车",
    sceneTitle: "Ra ngoài, di chuyển, lên xe, xuống xe, về nhà, đến trường",
    sceneNote: "Những từ này giúp bạn kể đường đi và phương tiện rất nhanh, đặc biệt trong các đoạn hội thoại HSK đầu cấp.",
    words: ["去", "来", "回", "走", "坐", "站", "上", "下", "进", "出", "开", "到", "从", "出租车", "公共汽车", "飞机", "火车", "地铁", "车", "路", "门"],
    keywords: ["taxi", "xe buyt", "may bay", "tau hoa", "tau dien ngam", "xe", "duong di", "ve nha", "vao", "ra ngoai", "len xe", "xuong xe"]
  },
  {
    id: "place",
    label: "Nơi chốn & phương hướng",
    shortLabel: "Nơi chốn",
    sceneHanzi: "里",
    sceneTitle: "Ở đâu, bên nào, phía nào, gần xa, trong ngoài trên dưới",
    sceneNote: "Bấm một lần để xem toàn bộ nhóm từ định vị không gian rất hay đi chung với 在, 去, 来.",
    words: ["这里", "这儿", "那里", "那儿", "前面", "后面", "里面", "外面", "上面", "下面", "左边", "右边", "旁边", "对面", "附近", "里面", "外边", "学校", "医院", "饭店", "商店", "房间", "桌子", "椅子"],
    keywords: ["noi", "phia truoc", "phia sau", "ben trong", "ben ngoai", "tren", "duoi", "ben trai", "ben phai", "gan", "xa", "doi dien", "phong"]
  },
  {
    id: "work",
    label: "Công việc & nơi làm",
    shortLabel: "Công việc",
    sceneHanzi: "工",
    sceneTitle: "Đi làm, tan làm, công ty và những vai trò công việc cơ bản",
    sceneNote: "Nhóm này nhỏ hơn nhưng rất thực dụng, nhất là khi bạn muốn tự giới thiệu công việc của mình.",
    words: ["工作", "上班", "下班", "公司", "办公室", "经理", "同事", "服务员", "医生"],
    keywords: ["cong viec", "di lam", "tan lam", "cong ty", "van phong", "phuc vu", "quan ly"]
  },
  {
    id: "body",
    label: "Cơ thể & sức khỏe",
    shortLabel: "Sức khỏe",
    sceneHanzi: "病",
    sceneTitle: "Nhóm từ nói về đau ốm, bác sĩ, thuốc và các bộ phận cơ thể",
    sceneNote: "Đây là một nhóm cực đáng học sớm vì dùng được ngay khi cần giúp đỡ hoặc nói tình trạng cơ thể.",
    words: ["病", "医生", "药", "身体", "头", "眼睛", "鼻子", "嘴", "耳朵", "牙", "手", "脚", "肚子", "累", "热", "冷"],
    keywords: ["benh", "bac si", "thuoc", "co the", "mat", "mui", "mieng", "tai", "rang", "tay", "chan", "met", "nong", "lanh"]
  },
  {
    id: "clothes",
    label: "Quần áo & màu sắc",
    shortLabel: "Quần áo",
    sceneHanzi: "衣",
    sceneTitle: "Mặc gì, màu gì, mới cũ đẹp xấu ra sao",
    sceneNote: "Bạn có thể dùng nhóm này khi mua đồ, tả người hoặc nói sở thích rất tự nhiên.",
    words: ["衣服", "裤子", "鞋", "帽子", "颜色", "白", "黑", "红", "蓝", "绿", "黄", "新", "旧", "漂亮"],
    keywords: ["ao", "quan", "giay", "mu", "mau", "trang", "den", "do", "xanh", "vang", "dep", "moi", "cu"]
  },
  {
    id: "weather",
    label: "Thời tiết & thiên nhiên",
    shortLabel: "Thời tiết",
    sceneHanzi: "天",
    sceneTitle: "Trời nóng lạnh, mưa nắng và vài từ thiên nhiên hay gặp",
    sceneNote: "Chủ đề này ghép rất gọn với mẫu câu 今天天气怎么样？ nên ôn khá nhanh.",
    words: ["天气", "天", "下雨", "雪", "风", "太阳", "云", "热", "冷", "山", "花", "水"],
    keywords: ["thoi tiet", "troi", "mua", "tuyet", "gio", "mat troi", "may", "nui", "hoa"]
  },
  {
    id: "daily",
    label: "Động từ hằng ngày",
    shortLabel: "Động từ",
    sceneHanzi: "做",
    sceneTitle: "Những động từ cơ bản dùng suốt ngày: ngủ, dậy, gọi, mở, đóng, đợi",
    sceneNote: "Đây là nhóm kéo phản xạ nói rất nhanh vì gần như ngày nào cũng dùng đến.",
    words: ["做", "睡觉", "起床", "打电话", "看", "听", "说", "问", "找", "等", "玩", "帮助", "打开", "关", "记得", "觉得", "知道", "认识", "喜欢", "想", "要", "会", "能", "可以"],
    keywords: ["ngu", "thuc day", "goi dien", "nhin", "nghe", "noi", "hoi", "tim", "doi", "choi", "giup", "mo", "dong", "nho", "cam thay", "biet", "quen", "thich", "muon"]
  },
  {
    id: "feelings",
    label: "Tính chất & cảm nhận",
    shortLabel: "Cảm nhận",
    sceneHanzi: "好",
    sceneTitle: "To nhỏ, đẹp xấu, đúng sai, vui buồn, thú vị hay nhàm chán",
    sceneNote: "Nhóm này giúp bạn nhận xét sự vật nhanh hơn thay vì chỉ gọi tên chúng.",
    words: ["好", "不好", "大", "小", "多", "少", "高", "低", "长", "短", "快", "慢", "对", "错", "漂亮", "忙", "累", "开心", "高兴", "有意思", "真", "太"],
    keywords: ["to", "nho", "nhieu", "it", "cao", "thap", "dai", "ngan", "nhanh", "cham", "dung", "sai", "dep", "ban", "met", "vui", "thu vi", "that su", "qua"]
  },
  {
    id: "grammar",
    label: "Ngữ pháp nền & từ công cụ",
    shortLabel: "Ngữ pháp",
    sceneHanzi: "是",
    sceneTitle: "Những từ nhỏ nhưng cực mạnh: là, có, không, cũng, đều, vì vậy...",
    sceneNote: "Đây là nhóm từ không hào nhoáng nhưng thiếu nó là không ráp nổi câu. Rất đáng ôn như một bộ riêng.",
    words: ["是", "有", "在", "不", "没", "的", "了", "也", "都", "和", "跟", "给", "就", "再", "先", "因为", "所以", "但是", "已经", "还", "过", "可以", "能", "会", "要", "让"],
    keywords: ["khong", "co", "la", "cung", "deu", "va", "voi", "cho", "roi", "truoc", "lai", "vi vay", "nhung", "da", "van con", "da tung"]
  },
  {
    id: "other",
    label: "Các từ khác rất hay gặp",
    shortLabel: "Khác",
    sceneHanzi: "常",
    sceneTitle: "Phần còn lại của HSK 1-2 vẫn nên nhìn một lượt để không sót từ quen mặt",
    sceneNote: "Nhóm này gom những từ chưa nằm gọn trong một chủ đề lớn nhưng vẫn xuất hiện thường xuyên trong bài đầu cấp.",
    words: [],
    keywords: []
  },
];

function normalizeTopicOverviewText(value) {
  return normalize(String(value || ""))
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesTopicOverviewKeyword(word, keywords = []) {
  if (!keywords.length) return false;
  const text = ` ${normalizeTopicOverviewText(word.meaning)} `;
  return keywords.some((keyword) => {
    const normalizedKeyword = normalizeTopicOverviewText(keyword);
    return normalizedKeyword && text.includes(` ${normalizedKeyword} `);
  });
}

function matchesTopicOverviewDefinition(definition, word) {
  return definition.words.includes(word.hanzi) || matchesTopicOverviewKeyword(word, definition.keywords);
}

function sortTopicOverviewWords(wordsToSort) {
  return [...wordsToSort].sort((left, right) =>
    left.level - right.level
    || left.hanzi.localeCompare(right.hanzi, "zh-Hans-CN")
  );
}

function invalidateTopicWorkshopCaches() {
  topicOverviewGroupsCacheKey = "";
  topicOverviewGroupsCache = [];
  topicReviewSourceOptionsCacheKey = "";
  topicReviewSourceOptionsCache = [];
  topicReviewPoolCacheKey = "";
  topicReviewPoolCache = [];
}

function getTopicOverviewGroups() {
  if (!hskVocabulary.length) return [];
  const cacheKey = `${hskVocabulary.length}:${hskVocabulary[0]?.hanzi || ""}:${hskVocabulary[hskVocabulary.length - 1]?.hanzi || ""}`;
  if (topicOverviewGroupsCacheKey === cacheKey && topicOverviewGroupsCache.length) {
    return topicOverviewGroupsCache;
  }

  const baseWords = hskVocabulary.filter((word) => word.level === 1 || word.level === 2);
  const matchedHanzi = new Set();
  const groups = [];

  topicOverviewDefinitions
    .filter((definition) => definition.id !== "other")
    .forEach((definition) => {
      const uniqueWords = new Map();
      baseWords.forEach((word) => {
        if (!matchesTopicOverviewDefinition(definition, word)) return;
        uniqueWords.set(word.hanzi, buildTopicReviewHskWord(word));
        matchedHanzi.add(word.hanzi);
      });
      if (!uniqueWords.size) return;
      const overviewWords = sortTopicOverviewWords([...uniqueWords.values()]);
      groups.push({
        ...definition,
        words: overviewWords,
        count: overviewWords.length,
        hsk1Count: overviewWords.filter((word) => word.level === 1).length,
        hsk2Count: overviewWords.filter((word) => word.level === 2).length,
      });
    });

  const otherDefinition = topicOverviewDefinitions.find((definition) => definition.id === "other");
  if (otherDefinition) {
    const otherWords = sortTopicOverviewWords(
      baseWords
        .filter((word) => !matchedHanzi.has(word.hanzi))
        .map((word) => buildTopicReviewHskWord(word))
    );
    if (otherWords.length) {
      groups.push({
        ...otherDefinition,
        words: otherWords,
        count: otherWords.length,
        hsk1Count: otherWords.filter((word) => word.level === 1).length,
        hsk2Count: otherWords.filter((word) => word.level === 2).length,
      });
    }
  }

  topicOverviewGroupsCacheKey = cacheKey;
  topicOverviewGroupsCache = groups;
  return groups;
}

function getActiveTopicOverviewGroup() {
  const overviewGroups = getTopicOverviewGroups();
  const activeGroup = overviewGroups.find((group) => group.id === activeTopicOverview) || overviewGroups[0] || null;
  if (activeGroup && activeGroup.id !== activeTopicOverview) {
    activeTopicOverview = activeGroup.id;
    localStorage.setItem("topicOverviewActive", activeGroup.id);
  }
  return activeGroup;
}

function setActiveTopicOverview(topicId) {
  activeTopicOverview = topicId;
  topicOverviewVisibleLimit = 24;
  localStorage.setItem("topicOverviewActive", topicId);
}

function showMoreTopicOverviewWords() {
  topicOverviewVisibleLimit += 24;
  renderTopicWorkshop();
}

const grid = document.querySelector("#word-grid");
const filters = document.querySelector("#filter-row");
const searchInput = document.querySelector("#search-input");
const resultSummary = document.querySelector("#result-summary");
const emptyState = document.querySelector("#empty-state");
const dialog = document.querySelector("#word-dialog");
const dialogContent = document.querySelector("#dialog-content");
const closeButton = document.querySelector("#dialog-close");
const initialFilter = document.querySelector("#initial-filter");
const initialTip = document.querySelector("#initial-tip");
const pronunciationGrid = document.querySelector("#pronunciation-grid");
const listenGroupButton = document.querySelector("#listen-group-button");
const practiceAudio = document.querySelector("#practice-audio");
const nowPlaying = document.querySelector("#now-playing");
const quizStartButton = document.querySelector("#quiz-start");
const quizIntro = document.querySelector("#quiz-intro");
const quizQuestion = document.querySelector("#quiz-question");
const quizResult = document.querySelector("#quiz-result");
const quizAudio = document.querySelector("#quiz-audio");
const quizReplayButton = document.querySelector("#quiz-replay");
const quizPlayIcon = document.querySelector("#quiz-play-icon");
const quizPrompt = document.querySelector("#quiz-prompt");
const quizOptions = document.querySelector("#quiz-options");
const quizSelectionDisplay = document.querySelector("#quiz-selection");
const quizFeedback = document.querySelector("#quiz-feedback");
const quizVerdict = document.querySelector("#quiz-verdict");
const quizRevealHanzi = document.querySelector("#quiz-reveal-hanzi");
const quizRevealPinyin = document.querySelector("#quiz-reveal-pinyin");
const quizRevealMeaning = document.querySelector("#quiz-reveal-meaning");
const quizRevealAnswer = document.querySelector("#quiz-reveal-answer");
const quizAutoAdvance = document.querySelector("#quiz-auto-advance");
const quizDelayDecrease = document.querySelector("#quiz-delay-decrease");
const quizDelayIncrease = document.querySelector("#quiz-delay-increase");
const quizDelayValue = document.querySelector("#quiz-delay-value");
const quizNextButton = document.querySelector("#quiz-next");
const quizProgress = document.querySelector("#quiz-progress");
const quizScoreDisplay = document.querySelector("#quiz-score");
const quizStreakDisplay = document.querySelector("#quiz-streak");
const hskSearchInput = document.querySelector("#hsk-search-input");
const hskLevelFilter = document.querySelector("#hsk-level-filter");
const hskResultSummary = document.querySelector("#hsk-result-summary");
const hskWordGrid = document.querySelector("#hsk-word-grid");
const hskLoadMore = document.querySelector("#hsk-load-more");
const sentenceTopicFilter = document.querySelector("#sentence-topic-filter");
const sentenceGrid = document.querySelector("#sentence-grid");
const sentenceLoadMore = document.querySelector("#sentence-load-more");
const questionGuideFilter = document.querySelector("#question-guide-filter");
const questionGuideGrid = document.querySelector("#question-guide-grid");
const interrogativeGrid = document.querySelector("#interrogative-grid");
const lessonMenu = document.querySelector("#lesson-menu");
const lessonMenuCurrent = document.querySelector("#lesson-menu-current");
const mainContent = document.querySelector("main");
const heroSection = document.querySelector(".hero");
const headerLookupForm = document.querySelector("#pinyin-lookup");
const headerLookupInput = document.querySelector("#pinyin-lookup-input");
const pinyinDictionaryForm = document.querySelector("#pinyin-dictionary-search");
const pinyinDictionaryInput = document.querySelector("#pinyin-dictionary-input");
const pinyinAnalysis = document.querySelector("#pinyin-analysis");
const pinyinToneFilter = document.querySelector("#pinyin-tone-filter");
const pinyinInitialShortcuts = document.querySelector("#pinyin-initial-shortcuts");
const pinyinContrastInput = document.querySelector("#pinyin-contrast-input");
const pinyinContrastResults = document.querySelector("#pinyin-contrast-results");
const pinyinContrastTool = document.querySelector(".pinyin-contrast-tool");
const pinyinResultSummary = document.querySelector("#pinyin-result-summary");
const pinyinResultGrid = document.querySelector("#pinyin-result-grid");
const dictationImport = document.querySelector("#dictation-import");
const dictationAudioFile = document.querySelector("#dictation-audio-file");
const dictationTranscript = document.querySelector("#dictation-transcript");
const dictationBuildButton = document.querySelector("#dictation-build");
const dictationClearButton = document.querySelector("#dictation-clear");
const dictationAudio = document.querySelector("#dictation-audio");
const dictationStatus = document.querySelector("#dictation-status");
const dictationLoop = document.querySelector("#dictation-loop");
const dictationSummary = document.querySelector("#dictation-summary");
const dictationList = document.querySelector("#dictation-list");
const topicFilter = document.querySelector("#topic-filter");
const topicReviewControls = document.querySelector("#topic-review-controls");
const topicMastery = document.querySelector("#topic-mastery");
const topicPanelSwitcher = document.querySelector("#topic-panel-switcher");
const topicListenPinyin = document.querySelector("#topic-listen-pinyin");
const topicFlashcard = document.querySelector("#topic-flashcard");
const topicChoice = document.querySelector("#topic-choice");
const topicStage = document.querySelector("#topic-stage");
const topicDrill = document.querySelector("#topic-drill");

const lessonLabels = {
  top: "Chọn mục học",
  "pinyin-dictionary": "Tra từ · Pinyin · bốn thanh",
  "common-questions": "Câu hỏi hay gặp",
  pronunciation: "Luyện âm đầu",
  "initial-quiz": "Kiểm tra nghe mù",
  "topic-workshop": "Học từ theo chủ đề",
  "real-dictation": "Chép chính tả người thật",
  "hsk-library": "988 từ để tra và nghe",
  "common-sentences": "Học từ trong câu thật",
  "interrogative-words": "Từ để hỏi",
  "question-guide": "Hỏi có không · this/that",
  "word-list": "Phân tích chuyên sâu",
};
const lessonSectionIds = Object.keys(lessonLabels).filter((id) => id !== "top");
const lessonSections = lessonSectionIds.map((id) => document.getElementById(id));

let activeCategory = "all";
let activeInitial = "z";
let quizQuestions = [];
let quizIndex = 0;
let quizScore = 0;
let quizStreak = 0;
let quizAnswered = false;
let quizSelection = [];
let quizAdvanceTimer = null;
let quizAutoAdvanceEnabled = localStorage.getItem("quizAutoAdvance") !== "false";
const storedQuizDelay = Number(localStorage.getItem("quizAutoAdvanceDelay"));
let quizAutoAdvanceDelay = Number.isInteger(storedQuizDelay) && storedQuizDelay >= 1 && storedQuizDelay <= 6
  ? storedQuizDelay
  : 6;
let hskVocabulary = [];
let hskActiveLevel = "all";
let hskVisibleLimit = 60;
let commonSentenceData = { topics: {}, sentences: [] };
let sentenceActiveTopic = "all";
let sentenceVisibleLimit = 24;
let hskPlayingButton = null;
let activeQuestionGuideGroup = "all";
let pinyinDictionaryTone = "all";
let dictationItems = [];
let dictationAudioUrl = "";
let dictationActiveIndex = -1;
let dictationSegmentStart = 0;
let dictationSegmentEnd = null;
let dictationPlayingButton = null;
let activeTopicWorkshop = localStorage.getItem("topicWorkshopActive") || "family";
let activeTopicOverview = localStorage.getItem("topicOverviewActive") || "family";
let topicReviewSelection = [];
let activeTopicPanel = localStorage.getItem("topicWorkshopPanel") || "flashcard";
let topicOverviewVisibleLimit = 24;
let topicStageMeaningVisible = localStorage.getItem("topicStageMeaningVisible") === "true";
let topicListenIndex = 0;
let topicListenInputValue = "";
let topicListenChecked = false;
let topicListenReveal = false;
let topicFlashIndex = 0;
let topicFlashChecked = false;
let topicFlashSentenceChecked = false;
let topicFlashMode = localStorage.getItem("topicFlashMode") || "both";
let topicFlashMeaningOpen = false;
let topicFlashRevealLevel = "none";
let topicChoiceIndex = 0;
let topicChoiceSelected = "";
let topicChoiceAnswered = false;
let topicChoiceOptions = [];
let topicChoiceDisplayMode = localStorage.getItem("topicChoiceDisplayMode") || "pinyin";
let topicChoiceOrder = [];
let topicChoiceOrderKey = "";
let topicDrillIndex = 0;
let topicDrillSelected = "";
let topicDrillAnswered = false;
let topicDrillMeaningOpen = false;
let topicKnownWords = {};
let topicOverviewGroupsCacheKey = "";
let topicOverviewGroupsCache = [];
let topicReviewSourceOptionsCacheKey = "";
let topicReviewSourceOptionsCache = [];
let topicReviewPoolCacheKey = "";
let topicReviewPoolCache = [];

try {
  topicReviewSelection = JSON.parse(localStorage.getItem("topicReviewSelection") || "[]") || [];
  if (!Array.isArray(topicReviewSelection)) topicReviewSelection = [];
} catch {
  topicReviewSelection = [];
}

try {
  topicKnownWords = JSON.parse(localStorage.getItem("topicKnownWords") || "{}") || {};
} catch {
  topicKnownWords = {};
}

const HSK_PAGE_SIZE = 60;
const SENTENCE_PAGE_SIZE = 24;
const hskPlayer = new Audio();
const pinyinInitials = ["zh", "ch", "sh", "j", "q", "x", "z", "c", "s", "r", "b", "p", "m", "f", "d", "t", "n", "l", "g", "k", "h"];
const pinyinConfusionGroups = [
  ["j", "q", "x"],
  ["z", "c", "s"],
  ["zh", "ch", "sh", "r"],
];
const pinyinConfusionSyllables = {
  j: ["ji", "jia", "jian", "jiang", "jiao", "jie", "jin", "jing", "jiong", "jiu", "ju", "juan", "jue", "jun"],
  q: ["qi", "qia", "qian", "qiang", "qiao", "qie", "qin", "qing", "qiong", "qiu", "qu", "quan", "que", "qun"],
  x: ["xi", "xia", "xian", "xiang", "xiao", "xie", "xin", "xing", "xiong", "xiu", "xu", "xuan", "xue", "xun"],
  z: ["zi", "za", "zai", "zan", "zang", "zao", "ze", "zei", "zen", "zeng", "zong", "zou", "zu", "zuan", "zui", "zun", "zuo"],
  c: ["ci", "ca", "cai", "can", "cang", "cao", "ce", "cen", "ceng", "cong", "cou", "cu", "cuan", "cui", "cun", "cuo"],
  s: ["si", "sa", "sai", "san", "sang", "sao", "se", "sen", "seng", "song", "sou", "su", "suan", "sui", "sun", "suo"],
  zh: ["zhi", "zha", "zhai", "zhan", "zhang", "zhao", "zhe", "zhei", "zhen", "zheng", "zhong", "zhou", "zhu", "zhua", "zhuai", "zhuan", "zhuang", "zhui", "zhun", "zhuo"],
  ch: ["chi", "cha", "chai", "chan", "chang", "chao", "che", "chen", "cheng", "chong", "chou", "chu", "chuai", "chuan", "chuang", "chui", "chun", "chuo"],
  sh: ["shi", "sha", "shai", "shan", "shang", "shao", "she", "shei", "shen", "sheng", "shou", "shu", "shua", "shuai", "shuan", "shuang", "shui", "shun", "shuo"],
  r: ["ri", "ran", "rang", "rao", "re", "ren", "reng", "rong", "rou", "ru", "ruan", "rui", "run", "ruo"],
};
const allConfusionSyllables = Object.values(pinyinConfusionSyllables).flat().sort((left, right) => right.length - left.length);
const toneMarkNumbers = {
  ā: 1, á: 2, ǎ: 3, à: 4,
  ē: 1, é: 2, ě: 3, è: 4,
  ī: 1, í: 2, ǐ: 3, ì: 4,
  ō: 1, ó: 2, ǒ: 3, ò: 4,
  ū: 1, ú: 2, ǔ: 3, ù: 4,
  ǖ: 1, ǘ: 2, ǚ: 3, ǜ: 4,
};
const pinyinToneMarkMap = {
  a: ["a", "ā", "á", "ǎ", "à"],
  e: ["e", "ē", "é", "ě", "è"],
  i: ["i", "ī", "í", "ǐ", "ì"],
  o: ["o", "ō", "ó", "ǒ", "ò"],
  u: ["u", "ū", "ú", "ǔ", "ù"],
  v: ["ü", "ǖ", "ǘ", "ǚ", "ǜ"],
};
const pinyinMarkedCharacterPattern = /[a-zA-ZüÜvVāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ:]/;

quizAutoAdvance.checked = quizAutoAdvanceEnabled;

function stopLessonAudio() {
  stopQuizAudio();
  stopRecordedAudio();
  resetHskPlayerButton();
  hskPlayer.pause();
  window.speechSynthesis?.cancel();
}

function showLesson(id, options = {}) {
  const targetId = lessonSectionIds.includes(id) ? id : "top";
  const isHome = targetId === "top";

  heroSection.hidden = !isHome;
  lessonSections.forEach((section) => {
    section.hidden = section.id !== targetId;
  });
  mainContent.classList.toggle("single-lesson-view", !isHome);
  lessonMenuCurrent.textContent = lessonLabels[targetId];
  lessonMenu.querySelectorAll("a[href^='#']").forEach((link) => {
    const isCurrent = link.getAttribute("href") === `#${targetId}`;
    if (isCurrent) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  localStorage.setItem("activeLesson", targetId);

  if (options.stopAudio !== false) stopLessonAudio();
  if (options.scroll !== false) {
    window.scrollTo({ top: 0, behavior: options.smooth ? "smooth" : "auto" });
  }
}

function initializeLessonView() {
  const hashId = window.location.hash.slice(1);
  const storedId = localStorage.getItem("activeLesson");
  const initialId = lessonLabels[hashId]
    ? hashId
    : lessonLabels[storedId]
      ? storedId
      : "top";

  if (hashId !== initialId) history.replaceState(null, "", `#${initialId}`);
  showLesson(initialId, { scroll: false, stopAudio: false });
}

function renderQuizAutoControls() {
  quizDelayValue.textContent = `${quizAutoAdvanceDelay} giây`;
  quizDelayDecrease.disabled = quizAutoAdvanceDelay === 1;
  quizDelayIncrease.disabled = quizAutoAdvanceDelay === 6;
}

renderQuizAutoControls();

const normalize = (text) => text
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/đ/g, "d")
  .toLowerCase();

function getRequestedTone(value) {
  const trimmed = value.trim().toLowerCase();
  const normalizedMeaning = normalize(trimmed);
  if (getSmartMeaningTargets(normalizedMeaning).length
    || hasMeaningMatch(trimmed)) {
    return "all";
  }
  const numberedTone = trimmed.match(/([1-5])$/)?.[1];
  if (numberedTone) return numberedTone === "5" ? "0" : numberedTone;
  if (!isPinyinLookupQuery(trimmed) || /\s/.test(trimmed)) return "all";
  const base = stripPinyinToneInput(trimmed);
  const hasExactPinyin = hskVocabulary.some((word) =>
    normalize(String(word.pinyin).replace(/[ǖǘǚǜü]/gi, "v")) === base
  );
  if (hskVocabulary.length && !hasExactPinyin) return "all";
  for (const character of trimmed) {
    if (toneMarkNumbers[character]) return String(toneMarkNumbers[character]);
  }
  return "all";
}

function stripPinyinToneInput(value) {
  return normalize(value.trim()
    .replace(/[ǖǘǚǜü]/gi, "v")
    .replace(/[1-5]$/g, ""));
}

function getFirstPinyinSyllable(pinyin) {
  return String(pinyin).trim().split(/[\s'’-]+/)[0] || "";
}

function getPinyinTone(pinyin) {
  const syllable = getFirstPinyinSyllable(pinyin).toLowerCase();
  for (const character of syllable) {
    if (toneMarkNumbers[character]) return String(toneMarkNumbers[character]);
  }
  return "0";
}

function pinyinMatchHasTone(pinyin, query, expectedTone) {
  const toneAtIndex = new Map();
  let normalizedPinyin = "";
  for (const character of String(pinyin).toLowerCase()) {
    const normalizedCharacter = normalize(character.replace(/[ǖǘǚǜü]/i, "v"));
    const startIndex = normalizedPinyin.length;
    normalizedPinyin += normalizedCharacter;
    if (toneMarkNumbers[character]) toneAtIndex.set(startIndex, String(toneMarkNumbers[character]));
  }

  let matchIndex = normalizedPinyin.indexOf(query);
  while (matchIndex >= 0) {
    const matchEnd = matchIndex + query.length;
    const matchedTone = [...toneAtIndex.entries()].find(([index]) => index >= matchIndex && index < matchEnd)?.[1] || "0";
    if (matchedTone === expectedTone) return true;
    matchIndex = normalizedPinyin.indexOf(query, matchIndex + 1);
  }
  return false;
}

function splitPinyinSyllable(value) {
  const base = stripPinyinToneInput(value).replace(/[^a-zv]/g, "");
  const initial = pinyinInitials.find((item) => base.startsWith(item)) || "∅";
  const final = initial === "∅" ? base : base.slice(initial.length);
  return { base, initial, final: final || "-" };
}

function isPinyinLookupQuery(value) {
  const trimmed = value.trim();
  return !/\s/.test(trimmed)
    && /^[a-zA-ZüÜvVāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ1-5'’-]+$/.test(trimmed);
}

function getMeaningParts(word) {
  const displayedMeaning = getConciseMeaning(word);

  return String(displayedMeaning || "")
    .split(/[;；,，]/)
    .map((part) => part.trim().normalize("NFC").toLowerCase())
    .filter(Boolean)
    .filter((part, index, parts) => parts.indexOf(part) === index);
}

function getMeaningMatchRank(word, query) {
  const exactQuery = String(query).trim().normalize("NFC").toLowerCase();
  const normalizedQuery = normalize(exactQuery).trim();
  if (!normalizedQuery) return Infinity;

  const exactParts = getMeaningParts(word);
  const exactTokens = exactParts.flatMap((part) => part.split(/[^a-zA-ZÀ-ɏḀ-ỿ0-9]+/).filter(Boolean));
  if (exactParts.includes(exactQuery)) return 0;
  if (exactParts.some((part) => part.startsWith(`${exactQuery} `))) return 1;
  if (exactTokens.includes(exactQuery)) return 2;
  if (exactQuery.length >= 3 && exactTokens.some((token) => token.startsWith(exactQuery))) return 3;

  // Khi người học đã gõ dấu tiếng Việt, không trộn thêm từ chỉ giống nhau sau khi bỏ dấu.
  if (exactQuery !== normalizedQuery) return Infinity;

  const normalizedParts = exactParts.map(normalize);
  if (normalizedParts.includes(normalizedQuery)) return 4;
  if (normalizedParts.some((part) => part.startsWith(`${normalizedQuery} `))) return 5;
  const normalizedTokens = normalizedParts.flatMap((part) => part.split(/[^a-z0-9]+/).filter(Boolean));
  if (normalizedTokens.includes(normalizedQuery)) return 6;
  if (normalizedQuery.length >= 3 && normalizedTokens.some((token) => token.startsWith(normalizedQuery))) return 7;
  return Infinity;
}

function hasMeaningMatch(query) {
  return hskVocabulary.some((word) => Number.isFinite(getMeaningMatchRank(word, query)));
}

const smartVietnameseLookup = {
  "này": ["这", "这个", "这些", "这里", "这儿", "这边"],
  "cái này": ["这个", "这"],
  "những cái này": ["这些"],
  "đây": ["这", "这里", "这儿", "这边"],
  "ở đây": ["这里", "这儿", "这边"],
  "kia": ["那", "那个", "那些", "那里", "那儿", "那边"],
  "cái kia": ["那个", "那"],
  "những cái kia": ["那些"],
  "đó": ["那", "那里", "那儿", "那个", "那边"],
  "ở đó": ["那里", "那儿", "那边"],
  "nào": ["哪", "哪个", "哪些"],
  "cái nào": ["哪个", "哪"],
  "những cái nào": ["哪些"],
  "đâu": ["哪里", "哪儿", "哪"],
  "ở đâu": ["哪里", "哪儿"],
  "ai": ["谁"],
  "gì": ["什么"],
  "cái gì": ["什么"],
  "mấy": ["几"],
  "bao nhiêu": ["多少", "几"],
  "thế nào": ["怎么样", "怎么"],
  "như thế nào": ["怎么样", "怎么"],
  "làm sao": ["怎么"],
  "tại sao": ["为什么"],
  "khi nào": ["什么时候"],
};

function getSmartMeaningTargets(query) {
  const normalizedQuery = normalize(query);
  const match = Object.entries(smartVietnameseLookup)
    .find(([label]) => normalize(label) === normalizedQuery);
  return match?.[1] || [];
}

function getDictionaryLookupIntent(value) {
  const raw = value.trim();
  if (!raw) return "empty";
  if (/[\u3400-\u9fff]/.test(raw)) return "word";

  const normalizedQuery = normalize(raw);
  const hasExactMeaning = getSmartMeaningTargets(normalizedQuery).length
    || hasMeaningMatch(raw);
  if (hasExactMeaning) return "meaning";
  if (/[1-5]$/.test(raw) || /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i.test(raw)) return "pinyin";

  const pinyinQuery = stripPinyinToneInput(raw);
  const hasExactPinyin = hskVocabulary.some((word) =>
    normalize(String(word.pinyin).replace(/[ǖǘǚǜü]/gi, "v")) === pinyinQuery
  );
  if (hasExactPinyin || isPinyinLookupQuery(raw)) return "pinyin";
  return "meaning";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getHskLevelLabel(level) {
  return level === 3 ? "HSK 3 · mở rộng" : `HSK ${level}`;
}

const hskMeaningOverrides = {
  白天: "ban ngày",
  百: "trăm",
  半: "một nửa; rưỡi",
  包子: "bánh bao",
  杯子: "cốc; chén",
  本: "quyển (lượng từ); gốc",
  边: "bên; phía",
  便宜: "rẻ",
  病: "bệnh; ốm",
  不客气: "không có gì",
  唱: "hát",
  车: "xe",
  打电话: "gọi điện thoại",
  大学: "trường đại học",
  到: "đến; tới",
  第: "thứ; tiền tố chỉ số thứ tự",
  点: "giờ; điểm; một chút",
  店: "cửa hàng",
  读书: "đọc sách; đi học",
  二: "hai",
  饭: "cơm; bữa ăn",
  非常: "rất; vô cùng",
  分: "phút; chia",
  歌: "bài hát"
};

function getConciseMeaning(word) {
  const curatedWord = words.find((item) => item.hanzi === word.hanzi);
  const meaning = hskMeaningOverrides[word.hanzi] || curatedWord?.meaning || word.meaning;
  const uniqueParts = [];
  String(meaning).split(";").forEach((part) => {
    const cleanPart = part.trim();
    if (!cleanPart) return;
    const normalizedPart = normalize(cleanPart);
    if (uniqueParts.some((item) => normalize(item) === normalizedPart)) return;
    uniqueParts.push(cleanPart);
  });
  const withoutSurname = uniqueParts.length > 1
    ? uniqueParts.filter((part) => !/^họ\s/i.test(part))
    : uniqueParts;
  return (withoutSurname.length ? withoutSurname : uniqueParts).slice(0, 3).join("; ");
}

function renderHskLevelFilter() {
  const levelCounts = hskVocabulary.reduce((counts, word) => {
    counts[word.level] = (counts[word.level] || 0) + 1;
    return counts;
  }, {});
  const options = [
    ["all", "Tất cả", hskVocabulary.length],
    ["1", "HSK 1", levelCounts[1] || 0],
    ["2", "HSK 2", levelCounts[2] || 0],
    ["3", "HSK 3 mở rộng", levelCounts[3] || 0]
  ];

  hskLevelFilter.innerHTML = options.map(([level, label, count]) => `
    <button class="hsk-level-button${level === hskActiveLevel ? " active" : ""}" data-hsk-level="${level}" type="button">
      ${label} · ${count}
    </button>
  `).join("");
}

function getFilteredHskWords() {
  const query = normalize(hskSearchInput.value.trim());
  return hskVocabulary.filter((word) => {
    const inLevel = hskActiveLevel === "all" || String(word.level) === hskActiveLevel;
    const haystack = normalize(`${word.hanzi} ${word.pinyin} ${word.meaning}`);
    return inLevel && haystack.includes(query);
  });
}

function renderHskWords() {
  const filteredWords = getFilteredHskWords();
  const visibleWords = filteredWords.slice(0, hskVisibleLimit);

  hskWordGrid.innerHTML = visibleWords.map((word) => `
    <article class="hsk-word-card">
      <button class="hsk-word-open" data-hsk-word="${escapeHtml(word.hanzi)}" type="button"
        aria-label="Xem ${escapeHtml(word.hanzi)}, ${escapeHtml(word.pinyin)}, ${escapeHtml(getConciseMeaning(word))}">
        <span class="hsk-word-level">${getHskLevelLabel(word.level)}</span>
        <span class="hsk-word-hanzi" lang="zh-Hans">${escapeHtml(word.hanzi)}</span>
        <span class="hsk-word-pinyin">${escapeHtml(word.pinyin)}</span>
        <span class="hsk-word-meaning">${escapeHtml(getConciseMeaning(word))}</span>
      </button>
      <button class="hsk-word-audio" data-hsk-audio="${escapeHtml(word.audio)}"
        data-hsk-label="${escapeHtml(word.hanzi)} · ${escapeHtml(word.pinyin)}" type="button"
        aria-label="Nghe phát âm ${escapeHtml(word.hanzi)}">▶</button>
    </article>
  `).join("");

  hskResultSummary.textContent = filteredWords.length
    ? `Đang hiển thị ${visibleWords.length} / ${filteredWords.length} từ phù hợp`
    : "Chưa tìm thấy từ phù hợp. Thử chữ Hán, Pinyin không dấu hoặc nghĩa Việt khác.";
  hskLoadMore.hidden = visibleWords.length >= filteredWords.length;
}

function renderPinyinToneFilter() {
  const options = [
    ["all", "Tất cả"],
    ["1", "Thanh 1 · ˉ"],
    ["2", "Thanh 2 · ˊ"],
    ["3", "Thanh 3 · ˇ"],
    ["4", "Thanh 4 · ˋ"],
    ["0", "Âm nhẹ"],
  ];
  pinyinToneFilter.innerHTML = options.map(([tone, label]) => `
    <button class="pinyin-tone-button${tone === pinyinDictionaryTone ? " active" : ""}"
      data-pinyin-tone="${tone}" type="button">${label}</button>
  `).join("");
}

function renderPinyinInitialShortcuts() {
  pinyinInitialShortcuts.innerHTML = pinyinConfusionGroups.map((group) => `
    <span>${group.map((initial) => `
      <button type="button" data-pinyin-contrast="${initial}">${initial}</button>
    `).join("")}</span>
  `).join('<i aria-hidden="true">·</i>');
}

function getConfusionFinal(initial, syllable) {
  let final = syllable.slice(initial.length);
  if (["j", "q", "x"].includes(initial)) {
    const umlautFinals = { u: "v", ue: "ve", uan: "van", un: "vn" };
    final = umlautFinals[final] || final;
  }
  return final;
}

function displayConfusionFinal(final) {
  return final.replace(/^v/, "ü");
}

function normalizeContrastQuery(value) {
  const normalized = stripPinyinToneInput(value).replace(/[^a-zv]/g, "");
  const aliases = { iou: "iu", uei: "ui", uen: "un" };
  return aliases[normalized] || normalized;
}

function parsePinyinContrastInputs(value) {
  return value
    .split(/[,;\n]+/)
    .map((part) => ({ raw: part.trim(), query: normalizeContrastQuery(part) }))
    .filter((item) => item.raw && item.query);
}

function getLeadingConfusionSyllable(pinyin) {
  const normalizedPinyin = normalize(String(pinyin).replace(/[ǖǘǚǜü]/gi, "v"));
  return allConfusionSyllables.find((syllable) => normalizedPinyin.startsWith(syllable)) || "";
}

function getMarkedPinyinPrefix(pinyin, syllable) {
  let normalizedLength = 0;
  let prefix = "";
  for (const character of String(pinyin)) {
    prefix += character;
    normalizedLength += normalize(character.replace(/[ǖǘǚǜü]/i, "v")).length;
    if (normalizedLength >= syllable.length) break;
  }
  return prefix;
}

function getToneSamplesForSyllable(syllable) {
  const samples = new Map();
  hskVocabulary
    .filter((word) => getLeadingConfusionSyllable(word.pinyin) === syllable)
    .sort((left, right) => String(left.pinyin).length - String(right.pinyin).length)
    .forEach((word) => {
      const tone = ["1", "2", "3", "4", "0"].find((item) => pinyinMatchHasTone(word.pinyin, syllable, item));
      if (tone && !samples.has(tone)) samples.set(tone, word);
    });
  return samples;
}

function renderContrastSyllableRow(initial, syllable) {
  const samples = getToneSamplesForSyllable(syllable);
  const toneButtons = ["1", "2", "3", "4"].map((tone) => {
    const word = samples.get(tone);
    if (!word) return `<span class="pinyin-contrast-empty" aria-label="Chưa có mẫu thanh ${tone}">—</span>`;
    const markedSyllable = getMarkedPinyinPrefix(word.pinyin, syllable);
    return `
      <button class="pinyin-contrast-audio" data-hsk-audio="${escapeHtml(word.audio)}"
        data-hsk-label="${escapeHtml(word.hanzi)} · ${escapeHtml(word.pinyin)}" type="button"
        aria-label="Nghe ${escapeHtml(markedSyllable)} trong từ ${escapeHtml(word.hanzi)}">
        <strong>${escapeHtml(markedSyllable)}</strong><small lang="zh-Hans">${escapeHtml(word.hanzi)}</small>
      </button>
    `;
  }).join("");

  return `
    <div class="pinyin-contrast-row">
      <span class="pinyin-contrast-initial">${escapeHtml(initial)}</span>
      <span class="pinyin-contrast-syllable">${escapeHtml(syllable)}</span>
      <div class="pinyin-contrast-tones">${toneButtons}</div>
    </div>
  `;
}

function renderPinyinContrastItem({ raw, query }) {
  const selectedGroup = pinyinConfusionGroups.find((group) => group.includes(query));
  if (selectedGroup) {
    const groupedFinals = [];
    selectedGroup.forEach((initial) => {
      pinyinConfusionSyllables[initial].forEach((syllable) => {
        const final = getConfusionFinal(initial, syllable);
        if (!groupedFinals.includes(final)) groupedFinals.push(final);
      });
    });
    const groups = groupedFinals.map((final) => {
      const rows = selectedGroup.map((initial) => {
        const syllable = pinyinConfusionSyllables[initial].find((item) => getConfusionFinal(initial, item) === final);
        return syllable ? renderContrastSyllableRow(initial, syllable) : "";
      }).join("");
      return `<section class="pinyin-contrast-group"><h4>${escapeHtml(displayConfusionFinal(final))}</h4>${rows}</section>`;
    }).join("");
    return `
      <section class="pinyin-contrast-query-block">
        <header><strong>${selectedGroup.join(" / ")}</strong><span>nhóm âm đầu · từ “${escapeHtml(raw)}”</span></header>
        ${groups}
      </section>
    `;
  }

  const exactSyllable = allConfusionSyllables.find((syllable) => syllable === query);
  if (exactSyllable) {
    const initial = pinyinInitials.find((item) => exactSyllable.startsWith(item));
    return `
      <section class="pinyin-contrast-query-block">
        <header><strong>${escapeHtml(raw)}</strong><span>âm tiết</span></header>
        <section class="pinyin-contrast-group"><h4>${escapeHtml(exactSyllable)}</h4>${renderContrastSyllableRow(initial, exactSyllable)}</section>
      </section>
    `;
  }

  const rows = pinyinConfusionGroups.flat().flatMap((initial) =>
    pinyinConfusionSyllables[initial]
      .filter((syllable) => getConfusionFinal(initial, syllable) === query)
      .map((syllable) => renderContrastSyllableRow(initial, syllable))
  );
  return rows.length
    ? `
      <section class="pinyin-contrast-query-block">
        <header><strong>${escapeHtml(raw)}</strong><span>vận mẫu</span></header>
        <section class="pinyin-contrast-group"><h4>${escapeHtml(displayConfusionFinal(query))}</h4>${rows.join("")}</section>
      </section>
    `
    : `<section class="pinyin-contrast-query-block"><p>Không có tổ hợp thật cho “${escapeHtml(raw)}” trong các nhóm âm dễ nhầm.</p></section>`;
}

function renderPinyinContrast() {
  const items = parsePinyinContrastInputs(pinyinContrastInput.value);
  if (!items.length) {
    pinyinContrastResults.innerHTML = "<p>Chọn một âm đầu hoặc nhập vận mẫu để tạo bảng so sánh.</p>";
    return;
  }

  if (!hskVocabulary.length) {
    pinyinContrastResults.innerHTML = "<p>Đang tải các từ mẫu Xiaoxiao...</p>";
    return;
  }

  pinyinContrastResults.innerHTML = items.map(renderPinyinContrastItem).join("");
}

function getPinyinDictionaryWords() {
  const rawQuery = pinyinDictionaryInput.value.trim();
  if (!rawQuery) return [];
  const intent = getDictionaryLookupIntent(rawQuery);
  const query = intent === "pinyin" ? stripPinyinToneInput(rawQuery) : normalize(rawQuery);
  const meaningQuery = intent === "meaning" ? rawQuery : query;
  const smartTargets = intent === "meaning" ? getSmartMeaningTargets(query) : [];
  const matches = hskVocabulary.filter((word) => {
    const pinyinBase = normalize(String(word.pinyin).replace(/[ǖǘǚǜü]/gi, "v"));
    const wordHaystack = normalize(`${word.hanzi} ${word.meaning}`);
    const matchesQuery = intent === "pinyin"
      ? pinyinBase.includes(query)
      : smartTargets.includes(word.hanzi)
        || normalize(word.hanzi).includes(query)
        || Number.isFinite(getMeaningMatchRank(word, meaningQuery));
    const matchesTone = pinyinDictionaryTone === "all"
      || (intent === "pinyin"
        ? pinyinMatchHasTone(word.pinyin, query, pinyinDictionaryTone)
        : getPinyinTone(word.pinyin) === pinyinDictionaryTone);
    return matchesQuery && matchesTone;
  });
  return matches.sort((left, right) => {
    const leftPinyin = normalize(String(left.pinyin).replace(/[ǖǘǚǜü]/gi, "v"));
    const rightPinyin = normalize(String(right.pinyin).replace(/[ǖǘǚǜü]/gi, "v"));
    if (intent === "pinyin") {
      const score = (pinyin) => pinyin === query ? 0 : pinyin.startsWith(query) ? 1 : 2;
      return score(leftPinyin) - score(rightPinyin) || leftPinyin.length - rightPinyin.length;
    }

    const meaningScore = (word) => {
      const smartIndex = smartTargets.indexOf(word.hanzi);
      if (smartIndex >= 0) return smartIndex - smartTargets.length - 2;
      if (normalize(word.hanzi) === query) return 0;
      return getMeaningMatchRank(word, meaningQuery);
    };
    return meaningScore(left) - meaningScore(right)
      || Number(left.level || 99) - Number(right.level || 99)
      || String(left.hanzi).length - String(right.hanzi).length;
  });
}

function renderPinyinDictionary() {
  renderPinyinToneFilter();
  const rawQuery = pinyinDictionaryInput.value.trim();
  const hasMainQuery = Boolean(rawQuery);
  pinyinContrastTool.hidden = hasMainQuery;
  pinyinToneFilter.hidden = !hasMainQuery;
  if (!rawQuery) {
    pinyinAnalysis.hidden = true;
    pinyinResultSummary.textContent = "Nhập một từ hoặc âm Pinyin để bắt đầu.";
    pinyinResultGrid.innerHTML = "";
    return;
  }

  const parsed = splitPinyinSyllable(rawQuery);
  const lookupIntent = getDictionaryLookupIntent(rawQuery);
  pinyinAnalysis.hidden = lookupIntent !== "pinyin" || !parsed.base || parsed.base.length > 6 || /[\s'’-]/.test(rawQuery.trim());
  if (!pinyinAnalysis.hidden) {
    pinyinAnalysis.innerHTML = `
      <span><small>ÂM ĐANG TRA</small><strong>${escapeHtml(parsed.base)}</strong></span>
      <span><small>ÂM ĐẦU</small><strong>${escapeHtml(parsed.initial)}</strong></span>
      <span><small>VẬN MẪU</small><strong>${escapeHtml(parsed.final)}</strong></span>
      <span><small>THANH</small><strong>${pinyinDictionaryTone === "all" ? "đủ thanh" : pinyinDictionaryTone === "0" ? "nhẹ" : pinyinDictionaryTone}</strong></span>
    `;
  }

  if (!hskVocabulary.length) {
    pinyinResultSummary.textContent = "Đang tải kho từ và âm thanh Xiaoxiao...";
    return;
  }

  const matches = getPinyinDictionaryWords();
  pinyinResultSummary.textContent = matches.length
    ? `Tìm thấy ${matches.length} từ. Bấm ▶ để nghe đúng bản ghi Xiaoxiao.`
    : "Chưa có từ phù hợp trong kho 988 từ hoặc chưa có bản ghi Xiaoxiao cho âm này.";
  pinyinResultGrid.innerHTML = matches.slice(0, 120).map((word) => `
    <article class="pinyin-result-card">
      <button class="pinyin-result-open" data-hsk-word="${escapeHtml(word.hanzi)}" type="button">
        <span class="hsk-word-level">${getHskLevelLabel(word.level)}</span>
        <strong lang="zh-Hans">${escapeHtml(word.hanzi)}</strong>
        <span>${escapeHtml(word.pinyin)}</span>
        <small>${escapeHtml(getConciseMeaning(word))}</small>
      </button>
      <button class="pinyin-result-audio" data-hsk-audio="${escapeHtml(word.audio)}"
        data-hsk-label="${escapeHtml(word.hanzi)} · ${escapeHtml(word.pinyin)}" type="button"
        aria-label="Nghe ${escapeHtml(word.hanzi)}">▶</button>
    </article>
  `).join("");
}

function openInternalPinyinLookup(value) {
  const query = value.trim();
  if (!query) return;
  pinyinDictionaryInput.value = query;
  pinyinDictionaryTone = getRequestedTone(query);
  history.pushState(null, "", "#pinyin-dictionary");
  showLesson("pinyin-dictionary", { smooth: true });
  renderPinyinDictionary();
}

function renderSentenceTopicFilter() {
  const topicCounts = commonSentenceData.sentences.reduce((counts, sentence) => {
    counts[sentence.topic] = (counts[sentence.topic] || 0) + 1;
    return counts;
  }, {});
  const options = [
    ["all", "Tất cả", commonSentenceData.sentences.length],
    ...Object.entries(commonSentenceData.topics).map(([key, label]) => [key, label, topicCounts[key] || 0])
  ];

  sentenceTopicFilter.innerHTML = options.map(([topic, label, count]) => `
    <button class="sentence-topic-button${topic === sentenceActiveTopic ? " active" : ""}"
      data-sentence-topic="${topic}" type="button">${escapeHtml(label)} · ${count}</button>
  `).join("");
}

function getFilteredSentences() {
  return commonSentenceData.sentences.filter((sentence) =>
    sentenceActiveTopic === "all" || sentence.topic === sentenceActiveTopic
  );
}

function renderSentences() {
  const filteredSentences = getFilteredSentences();
  const visibleSentences = filteredSentences.slice(0, sentenceVisibleLimit);

  sentenceGrid.innerHTML = visibleSentences.map((sentence) => `
    <article class="sentence-card">
      <div class="sentence-card-copy">
        <span class="sentence-topic">${escapeHtml(commonSentenceData.topics[sentence.topic])}</span>
        <strong class="sentence-hanzi" lang="zh-Hans">${escapeHtml(sentence.hanzi)}</strong>
        <span class="sentence-pinyin">${escapeHtml(sentence.pinyin)}</span>
        <small class="sentence-meaning">${escapeHtml(sentence.meaning)}</small>
      </div>
      <button class="sentence-audio" data-sentence-speak="${escapeHtml(sentence.hanzi)}"
        type="button" aria-label="Nghe câu ${escapeHtml(sentence.hanzi)}">▶</button>
    </article>
  `).join("");

  sentenceLoadMore.hidden = visibleSentences.length >= filteredSentences.length;
}

function renderQuestionGuideFilter() {
  const secondaryGuides = questionGuides.filter((guide) => guide.group !== "question");
  const groups = [
    ["all", "Tất cả", secondaryGuides.length],
    ["particle", "Mẫu câu hỏi", questionGuides.filter((guide) => guide.group === "particle").length],
    ["demonstrative", "This / that", questionGuides.filter((guide) => guide.group === "demonstrative").length]
  ];

  questionGuideFilter.innerHTML = groups.map(([group, label, count]) => `
    <button class="question-guide-filter-button${group === activeQuestionGuideGroup ? " active" : ""}"
      data-question-guide-group="${group}" type="button">${label} · ${count}</button>
  `).join("");
}

function renderQuestionGuideCards(guides) {
  return guides.map((guide) => `
    <article class="question-guide-card">
      <button class="question-guide-open" data-question-guide="${guide.id}" type="button"
        aria-label="Xem cách dùng ${escapeHtml(guide.hanzi)}, ${escapeHtml(guide.pinyin)}">
        <span class="question-guide-type">${guide.group === "question" ? "Từ để hỏi" : guide.group === "particle" ? "Mẫu câu hỏi" : "Từ chỉ định"}</span>
        <strong lang="zh-Hans">${escapeHtml(guide.hanzi)}</strong>
        <span class="question-guide-pinyin">${escapeHtml(guide.pinyin)}</span>
        <small>${escapeHtml(guide.meaning)}</small>
        <code>${escapeHtml(guide.pattern)}</code>
      </button>
      <button class="question-guide-audio" data-speak="${escapeHtml(guide.hanzi.split(" /")[0])}"
        type="button" aria-label="Nghe ${escapeHtml(guide.hanzi)}">▶</button>
    </article>
  `).join("");
}

function renderInterrogativeGuides() {
  interrogativeGrid.innerHTML = renderQuestionGuideCards(
    questionGuides.filter((guide) => guide.group === "question")
  );
}

function renderQuestionGuides() {
  const guides = questionGuides.filter((guide) =>
    guide.group !== "question"
    && (activeQuestionGuideGroup === "all" || guide.group === activeQuestionGuideGroup)
  );
  questionGuideGrid.innerHTML = renderQuestionGuideCards(guides);
}

function openQuestionGuide(id) {
  const guide = questionGuides.find((item) => item.id === id);
  if (!guide) return;

  const examples = guide.examples.map(([hanzi, pinyin, meaning]) => `
    <div class="example-sentence question-guide-example">
      <strong lang="zh-Hans">${escapeHtml(hanzi)}</strong>
      <span>${escapeHtml(pinyin)}</span>
      <small>${escapeHtml(meaning)}</small>
      <button class="question-example-audio" data-speak="${escapeHtml(hanzi)}" type="button" aria-label="Nghe câu ${escapeHtml(hanzi)}">▶</button>
    </div>
  `).join("");
  let coreRule;
  if (guide.id === "ma") {
    coreRule = {
      title: "Không thêm 吗 vào câu đã có từ để hỏi",
      text: "Dùng <strong>你是谁？</strong>, không dùng <strong>你是谁吗？</strong>. 谁 đã thể hiện điều cần hỏi nên không cần 吗."
    };
  } else if (guide.id === "ne") {
    coreRule = {
      title: "呢 cần một ngữ cảnh đã có sẵn",
      text: "Nói <strong>我很好，你呢？</strong> khi chủ đề “khỏe thế nào” đã rõ. 呢 giúp hỏi tiếp cùng chủ đề."
    };
  } else if (guide.id === "haishi") {
    coreRule = {
      title: "Câu lựa chọn thường không thêm 吗",
      text: "Dùng <strong>你喝茶还是咖啡？</strong>. 还是 đã tạo câu hỏi lựa chọn nên thường không cần thêm 吗 ở cuối."
    };
  } else if (guide.group === "question") {
    coreRule = {
      title: "Không đảo từ để hỏi lên đầu câu",
      text: "Đặt từ để hỏi đúng vào vị trí của phần trả lời. Ví dụ: <strong>我明天回家</strong> → <strong>你什么时候回家？</strong>"
    };
  } else {
    coreRule = {
      title: "Đừng quên lượng từ trước danh từ",
      text: "Với danh từ đếm được, dùng <strong>这/那 + lượng từ + danh từ</strong>: 这本书, 那辆车, 这个人."
    };
  }

  dialogContent.innerHTML = `
    <div class="dialog-hero question-guide-dialog-hero">
      <div class="dialog-character" lang="zh-Hans">${escapeHtml(guide.hanzi)}</div>
      <div class="dialog-intro">
        <p class="dialog-topic">${guide.group === "question" ? "Từ để hỏi" : guide.group === "particle" ? "Mẫu câu hỏi" : "Từ chỉ định"}</p>
        <h2>${escapeHtml(guide.meaning)}</h2>
        <p class="dialog-pinyin">${escapeHtml(guide.pinyin)}</p>
        <div class="dialog-actions">
          <button class="speak-button" data-speak="${escapeHtml(guide.hanzi.split(" /")[0])}">▶ Nghe phát âm</button>
        </div>
      </div>
    </div>
    <div class="dialog-body question-guide-dialog-body">
      <section class="detail-section">
        <p class="detail-label">Công thức</p>
        <h3>${escapeHtml(guide.pattern)}</h3>
        <p>${escapeHtml(guide.usage)}</p>
      </section>
      <section class="detail-section question-contrast-box">
        <p class="detail-label">Điểm dễ nhầm</p>
        <h3>So sánh nhanh</h3>
        <p>${escapeHtml(guide.contrast)}</p>
      </section>
      <section class="detail-section full-width">
        <p class="detail-label">Câu mẫu</p>
        <div class="question-guide-examples">${examples}</div>
      </section>
      <section class="detail-section full-width question-order-note">
        <p class="detail-label">Quy tắc cốt lõi</p>
        <h3>${coreRule.title}</h3>
        <p>${coreRule.text}</p>
      </section>
    </div>
  `;

  if (dialog.open) dialog.close();
  dialog.showModal();
}

function renderFilters() {
  filters.innerHTML = Object.entries(categories).map(([key, label]) => `
    <button class="filter-button${key === activeCategory ? " active" : ""}" data-category="${key}">
      ${label} · ${key === "all" ? words.length : words.filter((word) => word.category === key).length}
    </button>
  `).join("");
}

function getVisibleWords() {
  const query = normalize(searchInput.value.trim());
  return words.filter((word) => {
    const inCategory = activeCategory === "all" || word.category === activeCategory;
    const haystack = normalize(`${word.hanzi} ${word.pinyin} ${word.meaning} ${word.sino}`);
    return inCategory && haystack.includes(query);
  });
}

function renderWords() {
  const visibleWords = getVisibleWords();
  const categoryTotal = activeCategory === "all"
    ? words.length
    : words.filter((word) => word.category === activeCategory).length;
  grid.innerHTML = visibleWords.map((word) => `
    <button class="word-card" data-word="${word.hanzi}" aria-label="Xem chi tiết ${word.hanzi}, ${word.pinyin}, ${word.meaning}">
      <span class="word-card-category">
        ${categories[word.category]}
        <span class="card-arrow" aria-hidden="true">↗</span>
      </span>
      <span class="word-card-hanzi">${word.hanzi}</span>
      <span class="word-card-pinyin">${word.pinyin}</span>
      <span class="word-card-meaning">${word.meaning}</span>
    </button>
  `).join("");

  resultSummary.textContent = `Đang hiển thị ${visibleWords.length} / ${categoryTotal} bài phù hợp`;
  emptyState.hidden = visibleWords.length !== 0;
  grid.hidden = visibleWords.length === 0;
}

function emphasizeInitial(word) {
  const initialLength = word.initial.length;
  return `<strong>${word.pinyin.slice(0, initialLength)}</strong>${word.pinyin.slice(initialLength)}`;
}

function renderPronunciationPractice() {
  initialFilter.innerHTML = targetInitials.map((initial) => `
    <button class="initial-button${initial === activeInitial ? " active" : ""}" data-initial="${initial}" type="button">
      ${initial}
    </button>
  `).join("");

  const selectedWords = pronunciationWords.filter((word) => word.initial === activeInitial);
  initialTip.innerHTML = `<strong>${activeInitial}</strong><span>${initialTips[activeInitial]}</span>`;
  pronunciationGrid.innerHTML = selectedWords.map((word) => `
    <button class="pronunciation-card" data-practice-word="${word.hanzi}" type="button" aria-label="Nghe ${word.hanzi}, ${word.pinyin}, ${word.meaning}">
      <span class="pronunciation-card-top">
        <span class="level-badge">HSK ${word.level}</span>
        <span class="sound-icon" aria-hidden="true">▶</span>
      </span>
      <span class="pronunciation-hanzi" lang="zh-Hans">${word.hanzi}</span>
      <span class="pronunciation-pinyin">${emphasizeInitial(word)}</span>
      <span class="pronunciation-meaning">${word.meaning}</span>
    </button>
  `).join("");
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[randomIndex]] = [copy[randomIndex], copy[index]];
  }
  return copy;
}

function getWordInitials(word) {
  return normalize(word.pinyin).match(/zh|ch|sh|[zcsjqxr]/g) || [word.initial];
}

function getQuizPriority(word) {
  if (getWordInitials(word).length > 1) return 2;
  if ([...word.hanzi].length > 1) return 1;
  return 0;
}

function buildBalancedQuiz() {
  return shuffle(targetInitials.flatMap((initial) => {
    const pool = pronunciationWords.filter((word) => word.initial === initial);
    const prioritized = [2, 1, 0].flatMap((priority) =>
      shuffle(pool.filter((word) => getQuizPriority(word) === priority))
    );
    return prioritized.slice(0, 2);
  }));
}

function updateQuizStats() {
  const current = quizQuestions.length ? Math.min(quizIndex + 1, quizQuestions.length) : 0;
  quizProgress.textContent = `${current} / 20`;
  quizScoreDisplay.textContent = quizScore;
  quizStreakDisplay.textContent = quizStreak;
}

function stopQuizAudio() {
  quizAudio.pause();
  quizAudio.currentTime = 0;
  quizReplayButton.classList.remove("is-playing");
  quizPlayIcon.textContent = "▶";
}

function playQuizWord() {
  if (!quizQuestions[quizIndex]) return;
  stopRecordedAudio();
  window.speechSynthesis?.cancel();
  quizAudio.currentTime = 0;
  quizReplayButton.classList.add("is-playing");
  quizPlayIcon.textContent = "=";
  quizAudio.play().catch(() => {
    quizReplayButton.classList.remove("is-playing");
    quizPlayIcon.textContent = "▶";
  });
}

function renderQuizSelection() {
  const requiredCount = quizQuestions[quizIndex] ? getWordInitials(quizQuestions[quizIndex]).length : 1;
  quizSelectionDisplay.hidden = quizSelection.length === 0 || quizAnswered;
  quizSelectionDisplay.textContent = quizSelection.length
    ? `Đã chọn ${quizSelection.length}/${requiredCount}: ${quizSelection.join(" · ")}${quizSelection.length < requiredCount ? " · chọn âm tiếp theo" : ""}`
    : "";
}

function renderQuizQuestion() {
  if (quizAdvanceTimer) clearTimeout(quizAdvanceTimer);
  quizAdvanceTimer = null;
  const word = quizQuestions[quizIndex];
  quizAnswered = false;
  quizSelection = [];
  quizFeedback.hidden = true;
  quizFeedback.classList.remove("is-correct", "is-wrong");
  quizVerdict.classList.remove("is-correct", "is-wrong");
  const requiredCount = getWordInitials(word).length;
  quizPrompt.textContent = requiredCount > 1
    ? `Từ này cần chọn ${requiredCount} âm đầu theo đúng thứ tự`
    : "Nghe từ này bắt đầu bằng âm nào?";
  quizOptions.innerHTML = targetInitials.map((initial) => `
    <button class="quiz-option" data-quiz-initial="${initial}" type="button">${initial}</button>
  `).join("");
  quizAudio.src = `audio/xiaoxiao/${encodeURIComponent(word.hanzi)}.mp3?v=1`;
  quizAudio.load();
  renderQuizSelection();
  updateQuizStats();
  playQuizWord();
}

function scheduleQuizAdvance() {
  if (quizAdvanceTimer) clearTimeout(quizAdvanceTimer);
  quizAdvanceTimer = null;
  if (quizAutoAdvanceEnabled && quizAnswered) {
    quizAdvanceTimer = setTimeout(nextQuizQuestion, quizAutoAdvanceDelay * 1000);
  }
}

function changeQuizDelay(change) {
  quizAutoAdvanceDelay = Math.min(6, Math.max(1, quizAutoAdvanceDelay + change));
  localStorage.setItem("quizAutoAdvanceDelay", String(quizAutoAdvanceDelay));
  renderQuizAutoControls();
  scheduleQuizAdvance();
}

function startQuiz() {
  if (quizAdvanceTimer) clearTimeout(quizAdvanceTimer);
  quizAdvanceTimer = null;
  stopQuizAudio();
  quizQuestions = buildBalancedQuiz();
  quizIndex = 0;
  quizScore = 0;
  quizStreak = 0;
  quizIntro.hidden = true;
  quizResult.hidden = true;
  quizQuestion.hidden = false;
  renderQuizQuestion();
}

function addQuizInitial(initial) {
  if (quizAnswered) return;
  quizSelection.push(initial);
  renderQuizSelection();
  const expectedInitials = getWordInitials(quizQuestions[quizIndex]);
  if (quizSelection.length === expectedInitials.length) {
    answerQuiz();
  }
}

function answerQuiz() {
  if (quizAnswered || quizSelection.length === 0) return;
  quizAnswered = true;
  stopQuizAudio();

  const word = quizQuestions[quizIndex];
  const expectedInitials = getWordInitials(word);
  const selectedAnswer = quizSelection.join(" · ");
  const expectedAnswer = expectedInitials.join(" · ");
  const isCorrect = quizSelection.length === expectedInitials.length
    && quizSelection.every((initial, index) => initial === expectedInitials[index]);
  quizScore += isCorrect ? 1 : 0;
  quizStreak = isCorrect ? quizStreak + 1 : 0;

  quizOptions.querySelectorAll(".quiz-option").forEach((button) => {
    button.disabled = true;
    if (expectedInitials.includes(button.dataset.quizInitial)) button.classList.add("is-correct");
    if (!isCorrect && quizSelection.includes(button.dataset.quizInitial)
      && !expectedInitials.includes(button.dataset.quizInitial)) {
      button.classList.add("is-wrong");
    }
  });

  quizVerdict.textContent = isCorrect
    ? `Đúng rồi: ${expectedAnswer}`
    : `Chưa đúng: bạn chọn ${selectedAnswer}, đáp án là ${expectedAnswer}`;
  quizFeedback.classList.toggle("is-correct", isCorrect);
  quizFeedback.classList.toggle("is-wrong", !isCorrect);
  quizVerdict.classList.toggle("is-correct", isCorrect);
  quizVerdict.classList.toggle("is-wrong", !isCorrect);
  quizRevealHanzi.textContent = word.hanzi;
  quizRevealPinyin.textContent = word.pinyin;
  quizRevealMeaning.textContent = `${word.meaning} · HSK ${word.level}`;
  quizRevealAnswer.textContent = expectedAnswer;
  quizFeedback.hidden = false;
  renderQuizSelection();
  updateQuizStats();
  scheduleQuizAdvance();
}

function finishQuiz() {
  const percent = Math.round((quizScore / quizQuestions.length) * 100);
  const message = percent >= 90
    ? "Tai bạn đã phân biệt các nhóm âm rất chắc."
    : percent >= 70
      ? "Khá tốt. Hãy nghe lại các cặp bật hơi và không bật hơi."
      : "Nên quay lại phần luyện theo nhóm rồi thử thêm một lượt.";

  quizQuestion.hidden = true;
  quizResult.hidden = false;
  quizProgress.textContent = "20 / 20";
  quizResult.innerHTML = `
    <span class="quiz-ear" aria-hidden="true">听</span>
    <h3>Kết quả của bạn</h3>
    <strong>${quizScore}/20</strong>
    <p>${message}</p>
    <button class="quiz-primary-button" data-restart-quiz type="button">↻ Luyện một lượt mới</button>
  `;
  quizResult.querySelector("[data-restart-quiz]").focus();
}

function nextQuizQuestion() {
  if (!quizAnswered) return;
  quizIndex += 1;
  if (quizIndex >= quizQuestions.length) {
    finishQuiz();
    return;
  }
  renderQuizQuestion();
}

function getActiveTopicWorkshop() {
  return topicWorkshopData.find((topic) => topic.id === activeTopicWorkshop) || topicWorkshopData[0];
}

function normalizeTopicReviewSourceId(sourceId) {
  const legacyMap = {
    "topic:family": "overview:family",
    "topic:food": "overview:food",
    "topic:study": "overview:school",
    "topic:go": "overview:travel",
    "topic:time": "overview:time",
  };
  return legacyMap[sourceId] || sourceId;
}

function getTopicReviewSourceOptions() {
  const overviewGroups = getTopicOverviewGroups();
  const hsk1Count = hskVocabulary.filter((word) => word.level === 1).length;
  const hsk2Count = hskVocabulary.filter((word) => word.level === 2).length;
  const cacheKey = `${overviewGroups.map((group) => `${group.id}:${group.count}`).join("|")}|${hsk1Count}|${hsk2Count}`;
  if (topicReviewSourceOptionsCacheKey === cacheKey && topicReviewSourceOptionsCache.length) {
    return topicReviewSourceOptionsCache;
  }

  const overviewMap = new Map(overviewGroups.map((group) => [group.id, group]));
  topicReviewSourceOptionsCache = [
    ...topicOverviewDefinitions
      .filter((definition) => definition.id !== "other")
      .map((definition) => {
        const group = overviewMap.get(definition.id);
        return {
          id: `overview:${definition.id}`,
          label: definition.label,
          shortLabel: definition.shortLabel,
          type: "overview",
          count: group?.count || 0,
          hsk1Count: group?.hsk1Count || 0,
          hsk2Count: group?.hsk2Count || 0,
          note: group?.sceneTitle || definition.sceneTitle,
        };
      }),
    {
      id: "hsk:1",
      label: "HSK 1",
      shortLabel: "HSK 1",
      type: "hsk",
      level: 1,
      count: hsk1Count || 300,
      note: "300 từ nền tảng",
    },
    {
      id: "hsk:2",
      label: "HSK 2",
      shortLabel: "HSK 2",
      type: "hsk",
      level: 2,
      count: hsk2Count || 197,
      note: "197 từ mở rộng",
    },
  ];
  topicReviewSourceOptionsCacheKey = cacheKey;
  return topicReviewSourceOptionsCache;
}

function saveTopicReviewSelection() {
  const nextValue = JSON.stringify(topicReviewSelection);
  if (localStorage.getItem("topicReviewSelection") !== nextValue) {
    localStorage.setItem("topicReviewSelection", nextValue);
  }
}

function getTopicReviewDefaultSelection() {
  const overviewGroups = getTopicOverviewGroups();
  const currentOverview = overviewGroups.find((group) => group.id === activeTopicOverview);
  if (currentOverview) return [`overview:${currentOverview.id}`];
  const firstDefinition = topicOverviewDefinitions.find((definition) => definition.id !== "other");
  if (firstDefinition) return [`overview:${firstDefinition.id}`];
  return ["hsk:1"];
}

function syncTopicReviewSelection() {
  const validIds = new Set(getTopicReviewSourceOptions().map((source) => source.id));
  const normalizedSelection = [...new Set(
    topicReviewSelection
      .map(normalizeTopicReviewSourceId)
      .filter((id) => validIds.has(id))
  )];
  topicReviewSelection = normalizedSelection.length ? normalizedSelection : getTopicReviewDefaultSelection();
  saveTopicReviewSelection();
  return topicReviewSelection;
}

function getTopicReviewSelection() {
  return [...syncTopicReviewSelection()];
}

function getTopicReviewPresetMap() {
  const overviewIds = topicOverviewDefinitions
    .filter((definition) => definition.id !== "other")
    .map((definition) => `overview:${definition.id}`);
  return {
    current: [`overview:${getActiveTopicOverviewGroup()?.id || topicOverviewDefinitions[0]?.id || "family"}`],
    topics: overviewIds,
    hsk1: ["hsk:1"],
    hsk2: ["hsk:2"],
    hsk12: ["hsk:1", "hsk:2"],
    total: [...overviewIds, "hsk:1", "hsk:2"],
  };
}

function doesTopicReviewSelectionMatch(sourceIds) {
  const current = getTopicReviewSelection();
  if (current.length !== sourceIds.length) return false;
  const sourceSet = new Set(sourceIds);
  return current.every((id) => sourceSet.has(id));
}

function getTopicReviewDisplayName() {
  const selection = getTopicReviewSelection();
  const presets = getTopicReviewPresetMap();
  if (doesTopicReviewSelectionMatch(presets.total)) return "Ôn tổng thể";
  if (doesTopicReviewSelectionMatch(presets.hsk12)) return "HSK 1 + 2";
  const optionMap = new Map(getTopicReviewSourceOptions().map((source) => [source.id, source]));
  if (selection.length === 1) return optionMap.get(selection[0])?.label || "Bộ đang ôn";
  return `${selection.length} nguồn đang ôn`;
}

function getTopicReviewSourceSummary() {
  const selection = getTopicReviewSelection();
  const optionMap = new Map(getTopicReviewSourceOptions().map((source) => [source.id, source]));
  const labels = selection.map((id) => optionMap.get(id)?.label).filter(Boolean);
  if (labels.length <= 3) return labels.join(" · ");
  return `${labels.slice(0, 3).join(" · ")} · +${labels.length - 3} nguồn nữa`;
}

function buildTopicReviewOverviewWord(word, overviewGroup) {
  return {
    ...word,
    sourceLabel: overviewGroup.label,
    sourceShortLabel: overviewGroup.shortLabel,
    sourceType: "overview",
  };
}

function buildTopicReviewHskWord(word) {
  const curatedWord = words.find((item) => item.hanzi === word.hanzi);
  const meaning = getConciseMeaning(word);
  const example = curatedWord?.sentence?.length
    ? curatedWord.sentence
    : (() => {
      const sentence = getSentencesForWord(word)[0];
      return sentence
        ? [sentence.hanzi, sentence.pinyin, sentence.meaning]
        : [`请写：${word.hanzi}`, word.pinyin, meaning];
    })();
  return {
    ...(curatedWord || {}),
    hanzi: word.hanzi,
    pinyin: word.pinyin,
    meaning,
    chunk: curatedWord?.chunk || example[0] || word.hanzi,
    visual: curatedWord?.visual || `${getHskLevelLabel(word.level)} · tra nhanh`,
    memory: curatedWord?.memory || "Nghe âm, kéo nghĩa ra nhanh rồi đưa từ này vào một câu ngắn quen miệng.",
    sentence: example,
    sourceLabel: getHskLevelLabel(word.level),
    sourceShortLabel: `HSK ${word.level}`,
    sourceType: "hsk",
    level: word.level,
    audio: word.audio,
  };
}

function getTopicReviewPool() {
  const selection = getTopicReviewSelection();
  const cacheKey = `${selection.join("|")}::${hskVocabulary.length}`;
  if (topicReviewPoolCacheKey === cacheKey && topicReviewPoolCache.length) {
    return topicReviewPoolCache;
  }

  const uniqueWords = new Map();
  const overviewGroupMap = new Map(getTopicOverviewGroups().map((group) => [group.id, group]));
  const selectedOverviewIds = selection
    .filter((id) => id.startsWith("overview:"))
    .map((id) => id.replace("overview:", ""));
  const selectedHskLevels = selection
    .filter((id) => id.startsWith("hsk:"))
    .map((id) => Number(id.split(":")[1]))
    .filter((level) => Number.isFinite(level));

  selectedOverviewIds.forEach((overviewId) => {
    const group = overviewGroupMap.get(overviewId);
    if (!group) return;
    group.words.forEach((word) => {
      uniqueWords.set(word.hanzi, buildTopicReviewOverviewWord(word, group));
    });
  });

  selectedHskLevels.forEach((level) => {
    hskVocabulary
      .filter((word) => word.level === level)
      .forEach((word) => {
        if (!uniqueWords.has(word.hanzi)) {
          uniqueWords.set(word.hanzi, buildTopicReviewHskWord(word));
        }
      });
  });

  topicReviewPoolCache = [...uniqueWords.values()];
  topicReviewPoolCacheKey = cacheKey;
  return topicReviewPoolCache;
}

function renderTopicReviewControls(reviewPool = getTopicReviewPool()) {
  const selection = getTopicReviewSelection();
  const sourceOptions = getTopicReviewSourceOptions();
  const topicSources = sourceOptions.filter((source) => source.type === "overview");
  const hskSources = sourceOptions.filter((source) => source.type === "hsk");
  const presetButtons = [
    ["current", "Bài đang ôn"],
    ["topics", "Tất cả chủ đề"],
    ["hsk1", "HSK 1"],
    ["hsk2", "HSK 2"],
    ["hsk12", "HSK 1 + 2"],
    ["total", "Ôn tổng thể"],
  ].map(([presetId, label]) => `
    <button class="${doesTopicReviewSelectionMatch(getTopicReviewPresetMap()[presetId]) ? "active" : ""}" data-topic-review-preset="${presetId}" type="button">
      ${escapeHtml(label)}
    </button>
  `).join("");
  const renderSourceChip = (source) => {
    const countLabel = source.type === "hsk" && !hskVocabulary.length
      ? "đang nạp"
      : `${source.count} từ`;
    return `
      <label class="topic-review-chip ${selection.includes(source.id) ? "is-checked" : ""}">
        <input data-topic-review-source="${source.id}" type="checkbox" ${selection.includes(source.id) ? "checked" : ""} />
        <span>
          <b>${escapeHtml(source.label)}</b>
          <small>${escapeHtml(countLabel)} · ${escapeHtml(source.note)}</small>
        </span>
      </label>
    `;
  };
  const hsk1Count = sourceOptions.find((source) => source.id === "hsk:1")?.count || 300;
  const hsk2Count = sourceOptions.find((source) => source.id === "hsk:2")?.count || 197;

  topicReviewControls.innerHTML = `
    <article class="topic-review-card">
      <div class="topic-review-head">
        <div>
          <p class="section-kicker">CHỌN BỘ ÔN TẬP</p>
          <h3>Tick một hoặc nhiều nguồn từ để ôn</h3>
          <p>Ôn riêng từng chủ đề, trộn nhiều chủ đề, hoặc gọi thẳng cả bộ HSK 1 và HSK 2 để luyện tổng thể.</p>
        </div>
        <div class="topic-review-presets">
          ${presetButtons}
        </div>
      </div>
      <div class="topic-review-summary">
        <strong>${reviewPool.length ? `${reviewPool.length} từ trong bộ đang ôn` : "Đang nạp bộ từ bạn vừa chọn..."}</strong>
        <span>${escapeHtml(getTopicReviewSourceSummary())}</span>
        <small>HSK 1 có ${hsk1Count} từ, HSK 2 có ${hsk2Count} từ. Bạn có thể tick nhiều ô cùng lúc.</small>
      </div>
      <div class="topic-review-source-columns">
        <section class="topic-review-source-column">
          <header>
            <strong>Chủ đề luyện sâu</strong>
            <small>Nhóm nhỏ để ôn flash card, nghe, chọn đáp án và ghép câu.</small>
          </header>
          <div class="topic-review-source-grid">
            ${topicSources.map(renderSourceChip).join("")}
          </div>
        </section>
        <section class="topic-review-source-column is-hsk">
          <header>
            <strong>Kho HSK nền</strong>
            <small>Tick riêng HSK 1, HSK 2 hoặc ghép cả hai để ôn tổng thể.</small>
          </header>
          <div class="topic-review-source-grid topic-review-source-grid-hsk">
            ${hskSources.map(renderSourceChip).join("")}
          </div>
        </section>
      </div>
    </article>
  `;
}

function saveTopicKnownWords() {
  localStorage.setItem("topicKnownWords", JSON.stringify(topicKnownWords));
}

function isTopicWordKnown(hanzi) {
  return Boolean(topicKnownWords[hanzi]);
}

function setTopicWordKnown(hanzi, known) {
  if (known) {
    topicKnownWords[hanzi] = true;
  } else {
    delete topicKnownWords[hanzi];
  }
  saveTopicKnownWords();
}

function renderTopicFilter(reviewPool = getTopicReviewPool()) {
  const overviewGroups = getTopicOverviewGroups();
  const selection = getTopicReviewSelection();
  const sourceOptions = getTopicReviewSourceOptions();
  const hskSources = sourceOptions.filter((source) => source.type === "hsk");
  if (!overviewGroups.length) {
    topicFilter.innerHTML = `
      <div class="topic-filter-copy">
        <span class="topic-filter-label">Bản đồ chủ đề HSK 1-2</span>
        <small>Đang nạp các nhóm từ để bạn bấm xem tổng thể.</small>
      </div>
    `;
    return;
  }

  topicFilter.innerHTML = `
    <div class="topic-filter-copy">
      <span class="topic-filter-label">Bản đồ chủ đề HSK 1-2</span>
      <small>Tick để trộn bộ ôn. Bấm tên chủ đề để mở danh sách từ.</small>
    </div>
    <div class="topic-filter-status">
      <strong>${reviewPool.length} từ đang nằm trong bộ ôn</strong>
      <span>${escapeHtml(getTopicReviewSourceSummary())}</span>
    </div>
    <div class="topic-filter-sections">
      <section class="topic-filter-section topic-filter-section-hsk">
        <div class="topic-filter-section-head">
          <strong>Ôn theo cấp HSK</strong>
        </div>
        <div class="topic-filter-hsk-grid">
          ${hskSources.map((source) => `
            <label class="topic-filter-hsk-card ${selection.includes(source.id) ? "is-selected" : ""}">
              <input data-topic-review-source="${source.id}" type="checkbox" ${selection.includes(source.id) ? "checked" : ""} />
              <span>
                <b>${escapeHtml(source.label)}</b>
              </span>
            </label>
          `).join("")}
        </div>
      </section>
      <section class="topic-filter-section">
        <div class="topic-filter-section-head">
          <strong>Ôn theo chủ đề</strong>
        </div>
        <div class="topic-filter-topic-grid">
          ${overviewGroups.map((topic) => {
            const sourceId = `overview:${topic.id}`;
            const isSelected = selection.includes(sourceId);
            const isActive = topic.id === activeTopicOverview;
            return `
              <article class="topic-filter-topic-card ${isSelected ? "is-selected" : ""} ${isActive ? "is-active" : ""}">
                <label class="topic-filter-topic-check">
                  <input data-topic-review-source="${sourceId}" type="checkbox" ${isSelected ? "checked" : ""} />
                  <span>Chọn ôn</span>
                </label>
                <button class="topic-filter-topic-open" data-topic-overview-open="${topic.id}" type="button">
                  <b>${escapeHtml(topic.label)}</b>
                </button>
              </article>
            `;
          }).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderTopicSentenceWithBlank(prompt) {
  return escapeHtml(prompt).replace("____", "<span class=\"topic-blank\">____</span>");
}

function normalizeTopicPinyin(value) {
  return normalize(String(value || "")
    .replace(/[ǖǘǚǜü]/gi, "v"))
    .replace(/[1-5]/g, "")
    .replace(/[^a-zv]/g, "");
}

function normalizePinyinSyllableLetters(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/u:/g, "v")
    .replace(/[üǖǘǚǜ]/g, "v")
    .replace(/[āáǎà]/g, "a")
    .replace(/[ēéěè]/g, "e")
    .replace(/[īíǐì]/g, "i")
    .replace(/[ōóǒò]/g, "o")
    .replace(/[ūúǔù]/g, "u")
    .replace(/[^a-zv]/g, "");
}

function keepMarkedPinyinSyllable(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/u:/g, "ü")
    .replace(/v/g, "ü")
    .split("")
    .filter((character) => /[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(character))
    .join("");
}
function getTopicPanelOptions() {
  return [
    { id: "listen", label: "Nghe + Pinyin", note: "Bấm 1 2 3 4 để đặt thanh" },
    { id: "flashcard", label: "Flash card", note: "Gõ Pinyin hoặc nghĩa" },
    { id: "choice", label: "Chọn đáp án", note: "Nhìn chữ chọn đúng nghĩa" },
    { id: "drill", label: "Ghép câu", note: "Điền từ vào câu" },
    { id: "stage", label: "Xem chủ đề", note: "Bấm chủ đề để xem trọn bộ từ" },
  ];
}

function normalizeTopicPanel(panelId) {
  return getTopicPanelOptions().some((panel) => panel.id === panelId) ? panelId : "flashcard";
}

function saveTopicPanelPreference() {
  if (localStorage.getItem("topicWorkshopPanel") !== activeTopicPanel) {
    localStorage.setItem("topicWorkshopPanel", activeTopicPanel);
  }
}

function setActiveTopicPanel(panelId) {
  activeTopicPanel = normalizeTopicPanel(panelId);
  saveTopicPanelPreference();
  renderTopicWorkshop();
}

function renderTopicPanelSwitcher() {
  topicPanelSwitcher.innerHTML = `
    <div class="topic-panel-switcher-inner">
      <div class="topic-panel-switcher-copy">
        <small>HIỂN THỊ GỌN</small>
        <strong>Chỉ mở một khối để đỡ phải cuộn dài</strong>
      </div>
      <div class="topic-panel-switcher-buttons">
        ${getTopicPanelOptions().map((panel) => `
          <button class="${activeTopicPanel === panel.id ? "active" : ""}" data-topic-panel="${panel.id}" type="button">
            <b>${escapeHtml(panel.label)}</b>
            <span>${escapeHtml(panel.note)}</span>
          </button>
        `).join("")}
      </div>
    </div>
  `;
}

function applyTopicPanelVisibility() {
  const normalizedPanel = normalizeTopicPanel(activeTopicPanel);
  activeTopicPanel = normalizedPanel;
  saveTopicPanelPreference();
  topicListenPinyin.hidden = normalizedPanel !== "listen";
  topicFlashcard.hidden = normalizedPanel !== "flashcard";
  topicChoice.hidden = normalizedPanel !== "choice";
  topicDrill.hidden = normalizedPanel !== "drill";
  topicStage.hidden = normalizedPanel !== "stage";
  if (normalizedPanel === "listen") {
    topicListenPinyin.querySelector("#topic-listen-pinyin-input")?.focus();
  }
}

function setTopicWorkshopActiveTopic(topicId) {
  activeTopicWorkshop = topicId;
  localStorage.setItem("topicWorkshopActive", topicId);
}

function resetTopicWorkshopPracticeState() {
  topicListenIndex = 0;
  topicListenInputValue = "";
  topicListenChecked = false;
  topicListenReveal = false;
  topicFlashIndex = 0;
  topicFlashChecked = false;
  topicFlashSentenceChecked = false;
  topicFlashMeaningOpen = false;
  topicFlashRevealLevel = "none";
  topicChoiceIndex = 0;
  topicChoiceSelected = "";
  topicChoiceAnswered = false;
  topicChoiceOptions = [];
  topicChoiceOrder = [];
  topicChoiceOrderKey = "";
  topicDrillIndex = 0;
  topicDrillSelected = "";
  topicDrillAnswered = false;
  topicDrillMeaningOpen = false;
}

function setTopicReviewSelection(nextSelection) {
  const validIds = new Set(getTopicReviewSourceOptions().map((source) => source.id));
  const normalizedSelection = [...new Set(
    (nextSelection || [])
      .map(normalizeTopicReviewSourceId)
      .filter((id) => validIds.has(id))
  )];
  topicReviewSelection = normalizedSelection.length ? normalizedSelection : getTopicReviewDefaultSelection();
  const selectedOverviewIds = topicReviewSelection
    .filter((id) => id.startsWith("overview:"))
    .map((id) => id.replace("overview:", ""));
  if (selectedOverviewIds.length && !selectedOverviewIds.includes(activeTopicOverview)) {
    setActiveTopicOverview(selectedOverviewIds[0]);
  }
  saveTopicReviewSelection();
  resetTopicWorkshopPracticeState();
  renderTopicWorkshop();
}

function setTopicReviewSourceChecked(sourceId, checked) {
  const selection = new Set(getTopicReviewSelection());
  if (checked) {
    selection.add(normalizeTopicReviewSourceId(sourceId));
  } else {
    selection.delete(normalizeTopicReviewSourceId(sourceId));
  }
  const normalizedSourceId = normalizeTopicReviewSourceId(sourceId);
  if (checked && normalizedSourceId.startsWith("overview:")) {
    const overviewId = normalizedSourceId.replace("overview:", "");
    setActiveTopicOverview(overviewId);
  }
  setTopicReviewSelection([...selection]);
}

function setTopicReviewPreset(presetId) {
  const presets = getTopicReviewPresetMap();
  if (!presets[presetId]) return;
  setTopicReviewSelection(presets[presetId]);
}

function renderTopicSentenceWithBlank(prompt) {
  return escapeHtml(prompt).replace("____", "<span class=\"topic-blank\">____</span>");
}

function normalizeTopicPinyin(value) {
  return normalize(String(value || "")
    .replace(/[ǖǘǚǜü]/gi, "v"))
    .replace(/[1-5]/g, "")
    .replace(/[^a-zv]/g, "");
}

function normalizePinyinSyllableLetters(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/u:/g, "v")
    .replace(/[üǖǘǚǜ]/g, "v")
    .replace(/[āáǎà]/g, "a")
    .replace(/[ēéěè]/g, "e")
    .replace(/[īíǐì]/g, "i")
    .replace(/[ōóǒò]/g, "o")
    .replace(/[ūúǔù]/g, "u")
    .replace(/[^a-zv]/g, "");
}

function keepMarkedPinyinSyllable(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/u:/g, "ü")
    .replace(/v/g, "ü")
    .split("")
    .filter((character) => /[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/.test(character))
    .join("");
}

function addToneMarkToSyllable(value, toneNumber) {
  const tone = Number(toneNumber);
  const base = normalizePinyinSyllableLetters(value);
  if (!base) return "";
  if (!Number.isFinite(tone) || tone <= 0 || tone >= 5) return base.replace(/v/g, "ü");

  let vowelIndex = -1;
  if (base.includes("a")) vowelIndex = base.indexOf("a");
  else if (base.includes("e")) vowelIndex = base.indexOf("e");
  else if (base.includes("ou")) vowelIndex = base.indexOf("o");
  else {
    for (let index = base.length - 1; index >= 0; index -= 1) {
      if ("aeiouv".includes(base[index])) {
        vowelIndex = index;
        break;
      }
    }
  }

  if (vowelIndex < 0) return base.replace(/v/g, "ü");

  const vowel = base[vowelIndex];
  const marked = pinyinToneMarkMap[vowel]?.[tone] || vowel;
  const prefix = base.slice(0, vowelIndex).replace(/v/g, "ü");
  const suffix = base.slice(vowelIndex + 1).replace(/v/g, "ü");
  return `${prefix}${marked}${suffix}`;
}

function canonicalizePinyinSurface(value) {
  const text = String(value || "").trim().replace(/u:/gi, "v");
  let output = "";
  let syllableBuffer = "";

  for (const character of text) {
    if (pinyinMarkedCharacterPattern.test(character)) {
      syllableBuffer += character;
      continue;
    }
    if (/[1-5]/.test(character)) {
      output += addToneMarkToSyllable(syllableBuffer, Number(character));
      syllableBuffer = "";
      continue;
    }
    output += keepMarkedPinyinSyllable(syllableBuffer);
    syllableBuffer = "";
  }

  output += keepMarkedPinyinSyllable(syllableBuffer);
  return output;
}

function applyToneNumberAtCursor(value, toneNumber, cursorIndex = String(value || "").length) {
  const text = String(value || "");
  const beforeCursor = text.slice(0, cursorIndex);
  let syllableStart = beforeCursor.length;

  while (syllableStart > 0 && pinyinMarkedCharacterPattern.test(beforeCursor[syllableStart - 1])) {
    syllableStart -= 1;
  }

  const syllable = beforeCursor.slice(syllableStart);
  if (!syllable) {
    return { value: text, cursor: cursorIndex };
  }

  const replaced = addToneMarkToSyllable(syllable, Number(toneNumber));
  return {
    value: `${text.slice(0, syllableStart)}${replaced}${text.slice(cursorIndex)}`,
    cursor: syllableStart + replaced.length,
  };
}

function topicPinyinAnswerMatches(input, expected) {
  return canonicalizePinyinSurface(input) === canonicalizePinyinSurface(expected);
}

function normalizeTopicMeaning(value) {
  return normalize(String(value || ""))
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isTopicMeaningCorrect(input, meaning) {
  const answer = normalizeTopicMeaning(input);
  if (!answer) return false;
  const parts = String(meaning || "")
    .split(/[;；,，]/)
    .map(normalizeTopicMeaning)
    .filter(Boolean);
  return parts.some((part) =>
    part === answer
    || part.includes(answer)
    || answer.includes(part)
    || part.split(" ").includes(answer)
  );
}

function getTopicMeaningLabel(meaning) {
  return String(meaning || "")
    .split(/[;；]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join("; ");
}

function getCurrentTopicWord(reviewPool = getTopicReviewPool()) {
  if (!reviewPool.length) return null;
  return reviewPool[topicFlashIndex % reviewPool.length];
}

function getCurrentTopicListenWord(reviewPool = getTopicReviewPool()) {
  if (!reviewPool.length) return null;
  return reviewPool[topicListenIndex % reviewPool.length];
}

function getTopicChoicePoolKey(reviewPool = getTopicReviewPool()) {
  return reviewPool.map((word) => word.hanzi).join("|");
}

function isTopicChoiceOrderWellMixed(order, originalOrder) {
  if (order.length <= 2 || originalOrder.length !== order.length) return true;
  const checkLength = Math.min(8, order.length);
  const sourceIndexMap = new Map(originalOrder.map((hanzi, index) => [hanzi, index]));
  let samePositionCount = 0;
  let adjacentSourceNeighborCount = 0;

  for (let index = 0; index < checkLength; index += 1) {
    const sourceIndex = sourceIndexMap.get(order[index]);
    if (sourceIndex === index) samePositionCount += 1;
    if (index > 0) {
      const previousSourceIndex = sourceIndexMap.get(order[index - 1]);
      if (Math.abs(previousSourceIndex - sourceIndex) === 1) {
        adjacentSourceNeighborCount += 1;
      }
    }
  }

  return samePositionCount === 0 && adjacentSourceNeighborCount <= Math.max(1, Math.floor(checkLength / 4));
}

function buildTopicChoiceOrder(reviewPool = getTopicReviewPool(), previousLastHanzi = "") {
  const originalOrder = reviewPool.map((word) => word.hanzi);
  if (originalOrder.length <= 1) return originalOrder;

  let bestOrder = shuffle(originalOrder);
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const candidate = shuffle(originalOrder);
    const startsWithPreviousLast = previousLastHanzi && candidate[0] === previousLastHanzi;
    if (!startsWithPreviousLast && isTopicChoiceOrderWellMixed(candidate, originalOrder)) {
      return candidate;
    }
    if (isTopicChoiceOrderWellMixed(candidate, originalOrder)) {
      bestOrder = candidate;
    }
  }

  if (previousLastHanzi && bestOrder.length > 1 && bestOrder[0] === previousLastHanzi) {
    return [...bestOrder.slice(1), bestOrder[0]];
  }
  return bestOrder;
}

function ensureTopicChoiceOrder(reviewPool = getTopicReviewPool()) {
  if (!reviewPool.length) {
    topicChoiceOrder = [];
    topicChoiceOrderKey = "";
    topicChoiceIndex = 0;
    return topicChoiceOrder;
  }

  const poolKey = getTopicChoicePoolKey(reviewPool);
  const currentHanziSet = new Set(reviewPool.map((word) => word.hanzi));
  const shouldResetOrder = topicChoiceOrderKey !== poolKey
    || topicChoiceOrder.length !== reviewPool.length
    || topicChoiceOrder.some((hanzi) => !currentHanziSet.has(hanzi));

  if (shouldResetOrder) {
    topicChoiceOrder = buildTopicChoiceOrder(reviewPool);
    topicChoiceOrderKey = poolKey;
    topicChoiceIndex = 0;
    topicChoiceSelected = "";
    topicChoiceAnswered = false;
    topicChoiceOptions = [];
  }

  return topicChoiceOrder;
}

function getCurrentTopicChoiceWord(reviewPool = getTopicReviewPool()) {
  if (!reviewPool.length) return null;
  const choiceOrder = ensureTopicChoiceOrder(reviewPool);
  const currentHanzi = choiceOrder[topicChoiceIndex % choiceOrder.length];
  return reviewPool.find((word) => word.hanzi === currentHanzi) || reviewPool[0];
}

function getTopicChoiceOptionHanzi(reviewPool = getTopicReviewPool()) {
  const choiceOrder = ensureTopicChoiceOrder(reviewPool);
  if (!choiceOrder.length) return [];
  const optionCount = Math.min(8, choiceOrder.length);
  const currentIndex = topicChoiceIndex % choiceOrder.length;
  const beforeCount = Math.floor((optionCount - 1) / 2);
  const afterCount = optionCount - beforeCount - 1;
  const optionHanzi = [];

  for (let offset = -beforeCount; offset <= afterCount; offset += 1) {
    const index = (currentIndex + offset + choiceOrder.length) % choiceOrder.length;
    optionHanzi.push(choiceOrder[index]);
  }

  return optionHanzi;
}

function resetTopicChoiceOptions(reviewPool = getTopicReviewPool()) {
  const word = getCurrentTopicChoiceWord(reviewPool);
  if (!word) {
    topicChoiceOptions = [];
    return;
  }
  topicChoiceOptions = getTopicChoiceOptionHanzi(reviewPool);
}

function getTopicChoiceOptionLabel(word) {
  if (topicChoiceDisplayMode === "full") {
    return `${word.pinyin} · ${getTopicMeaningLabel(word.meaning)}`;
  }
  return word.pinyin;
}

function getTopicFlashModes() {
  return {
    both: {
      label: "Cả hai",
      description: "Nhìn chữ rồi tự gõ cả Pinyin lẫn nghĩa.",
      needsPinyin: true,
      needsMeaning: true,
    },
    pinyin: {
      label: "Pinyin",
      description: "Chỉ tập gọi âm đúng của chữ.",
      needsPinyin: true,
      needsMeaning: false,
    },
    meaning: {
      label: "Nghĩa",
      description: "Chỉ tập kéo nghĩa tiếng Việt ra thật nhanh.",
      needsPinyin: false,
      needsMeaning: true,
    },
  };
}

function getTopicFlashModeConfig(mode = topicFlashMode) {
  const modes = getTopicFlashModes();
  return modes[mode] || modes.both;
}

function getTopicSentencePrompt(word) {
  if (!word) return "____";
  const sentence = word.sentence?.[0] || word.chunk || "";
  if (sentence.includes(word.hanzi)) return sentence.replace(word.hanzi, "____");
  if (sentence.includes("____")) return sentence;
  return sentence ? `${sentence} ____` : "____";
}

function getTopicWorkshopEmptyState(title, detail) {
  return `
    <article class="topic-empty-card">
      <strong>${escapeHtml(title)}</strong>
      <span>${escapeHtml(detail)}</span>
    </article>
  `;
}

function getSingleTopicReview() {
  const selection = getTopicReviewSelection();
  if (selection.length !== 1 || !selection[0].startsWith("overview:")) return null;
  const overviewId = selection[0].replace("overview:", "");
  const overviewToWorkshopMap = {
    family: "family",
    food: "food",
    school: "study",
    travel: "go",
    time: "time",
  };
  const workshopId = overviewToWorkshopMap[overviewId];
  if (!workshopId) return null;
  return topicWorkshopData.find((topic) => topic.id === workshopId) || null;
}

function getTopicDrillPrompt(word) {
  if (!word) return "请写：____";
  const sentence = word?.sentence?.[0] || word?.chunk || "";
  if (sentence.includes(word.hanzi)) return sentence.replace(word.hanzi, "____");
  if (sentence.includes("____")) return sentence;
  return "请写：____";
}

function getTopicDrillMeaning(word) {
  return word?.sentence?.[2] || getTopicMeaningLabel(word?.meaning);
}

function getTopicDrillTotal(reviewPool = getTopicReviewPool()) {
  const singleTopic = getSingleTopicReview();
  if (singleTopic) return singleTopic.drills.length;
  return reviewPool.length;
}

function getTopicDrillData(reviewPool = getTopicReviewPool()) {
  const singleTopic = getSingleTopicReview();
  if (singleTopic) {
    return {
      ...singleTopic.drills[topicDrillIndex % singleTopic.drills.length],
      total: singleTopic.drills.length,
      detail: "Bài ghép câu của đúng chủ đề đang ôn.",
    };
  }
  if (!reviewPool.length) return null;
  const word = reviewPool[topicDrillIndex % reviewPool.length];
  const distractors = shuffle(reviewPool.filter((item) => item.hanzi !== word.hanzi))
    .slice(0, Math.min(3, reviewPool.length - 1))
    .map((item) => item.hanzi);
  return {
    answer: word.hanzi,
    prompt: getTopicDrillPrompt(word),
    meaning: getTopicDrillMeaning(word),
    total: reviewPool.length,
    options: shuffle([word.hanzi, ...distractors]),
    word,
    detail: `Từ bộ ôn: ${word.sourceLabel || getTopicReviewDisplayName()}`,
  };
}

function renderTopicListenPinyin(reviewPool = getTopicReviewPool()) {
  const word = getCurrentTopicListenWord(reviewPool);
  if (!word) {
    topicListenPinyin.innerHTML = getTopicWorkshopEmptyState(
      "Đang nạp bài nghe Pinyin",
      "Chờ một chút để app dựng bài nghe theo bộ từ bạn đang chọn."
    );
    return;
  }

  const canonicalInput = canonicalizePinyinSurface(topicListenInputValue);
  const exactCorrect = topicPinyinAnswerMatches(canonicalInput, word.pinyin);
  const sameBase = normalizeTopicPinyin(canonicalInput) === normalizeTopicPinyin(word.pinyin);
  const showFeedback = topicListenChecked || topicListenReveal;
  const statusClass = topicListenChecked
    ? exactCorrect ? "is-correct" : "is-wrong"
    : topicListenReveal ? "is-reveal" : "";
  const feedbackTitle = topicListenReveal
    ? "Đây là đáp án tham chiếu."
    : exactCorrect
      ? "Chuẩn rồi. Pinyin và thanh điệu đều khớp."
      : sameBase
        ? "Âm tiết đúng rồi, nhưng thanh điệu chưa khớp hết."
        : "Chưa khớp. Nghe lại rồi thử gõ chậm từng âm tiết.";
  const nextLabel = topicListenChecked || topicListenReveal ? "Từ tiếp theo" : "Bỏ qua từ này";

  topicListenPinyin.innerHTML = `
    <article class="topic-listen-card ${statusClass}">
      <div class="topic-listen-head">
        <div>
          <p class="section-kicker">NGHE + GÕ PINYIN · ${topicListenIndex + 1}/${reviewPool.length}</p>
          <span>${escapeHtml(word.sourceLabel || getTopicReviewDisplayName())}</span>
        </div>
        <button class="topic-audio-button" data-topic-audio="${escapeHtml(word.hanzi)}" type="button">▶ Nghe</button>
      </div>
      <div class="topic-listen-prompt">
        <strong lang="zh-Hans">${escapeHtml(word.hanzi)}</strong>
        <small>Nhìn chữ, nghe âm rồi gõ Pinyin có dấu.</small>
      </div>
      <form class="topic-listen-form" id="topic-listen-form">
        <label>
          <span>GÕ PINYIN CÓ DẤU</span>
          <input
            id="topic-listen-pinyin-input"
            name="topicListenPinyin"
            type="text"
            autocomplete="off"
            autocapitalize="off"
            spellcheck="false"
            inputmode="latin-prose"
            value="${escapeHtml(canonicalInput)}"
            placeholder="Ví dụ: xue2xiao4 → xuéxiào"
          />
        </label>
        <div class="topic-listen-tone-hint">
          <b>Mẹo gõ nhanh:</b>
          <span><kbd>1</kbd> mā</span>
          <span><kbd>2</kbd> má</span>
          <span><kbd>3</kbd> mǎ</span>
          <span><kbd>4</kbd> mà</span>
          <span><kbd>v</kbd> hoặc <kbd>u:</kbd> → <b>ü</b></span>
        </div>
        <button class="topic-check-button" type="submit">Kiểm tra Pinyin</button>
      </form>
      <div class="topic-listen-feedback" ${showFeedback ? "" : "hidden"}>
        <strong>${feedbackTitle}</strong>
        <span><b>${escapeHtml(word.pinyin)}</b> · ${escapeHtml(getTopicMeaningLabel(word.meaning))}</span>
        <small><b>Chunk:</b> ${escapeHtml(word.chunk)}</small>
      </div>
      <div class="topic-listen-actions">
        <button class="topic-next-button ${topicListenReveal ? "active" : ""}" data-topic-listen-reveal type="button">Hiện đáp án</button>
        <button class="topic-next-button topic-choice-next-button" data-topic-listen-next type="button">${nextLabel}</button>
      </div>
    </article>
  `;
}

function renderTopicFlashcard(reviewPool = getTopicReviewPool()) {
  const word = getCurrentTopicWord(reviewPool);
  if (!word) {
    topicFlashcard.innerHTML = getTopicWorkshopEmptyState(
      "Đang nạp flash card",
      "Chờ một chút để app dựng bộ từ bạn vừa chọn."
    );
    return;
  }
  const flashMode = getTopicFlashModeConfig();
  const meaningLabel = getTopicMeaningLabel(word.meaning);
  const revealPinyin = topicFlashRevealLevel === "pinyin" || topicFlashRevealLevel === "full";
  const revealMeaning = topicFlashRevealLevel === "full";
  const showFeedback = topicFlashChecked || revealPinyin;
  const pinyinInput = topicFlashcard.querySelector("#topic-flash-pinyin")?.value || "";
  const meaningInput = topicFlashcard.querySelector("#topic-flash-meaning")?.value || "";
  const sentenceInput = topicFlashcard.querySelector("#topic-flash-sentence")?.value || "";
  const pinyinCorrect = !flashMode.needsPinyin
    || (topicFlashChecked && normalizeTopicPinyin(pinyinInput) === normalizeTopicPinyin(word.pinyin));
  const meaningCorrect = !flashMode.needsMeaning
    || (topicFlashChecked && isTopicMeaningCorrect(meaningInput, word.meaning));
  const basePassed = topicFlashChecked && pinyinCorrect && meaningCorrect;
  const sentenceCorrect = topicFlashSentenceChecked
    && (normalizeDictationHanzi(sentenceInput) === normalizeDictationHanzi(word.hanzi)
      || normalizeTopicPinyin(sentenceInput) === normalizeTopicPinyin(word.pinyin));
  const flashModeButtons = ["both", "pinyin", "meaning"].map((mode) => `
    <button class="${topicFlashMode === mode ? "active" : ""}" data-topic-flash-mode="${mode}" type="button">
      ${escapeHtml(getTopicFlashModeConfig(mode).label)}
    </button>
  `).join("");
  const flashModeActionLabel = flashMode.needsPinyin && flashMode.needsMeaning
    ? "Kiểm tra Pinyin + nghĩa"
    : flashMode.needsPinyin
      ? "Kiểm tra Pinyin"
      : "Kiểm tra nghĩa";
  const feedbackHeadline = topicFlashChecked
    ? basePassed ? "Ổn rồi. Giờ đưa từ này vào câu." : "Chưa nhuần, nhìn lại đáp án rồi gõ lại một lần nữa."
    : revealMeaning
      ? "Đã hiện cả Pinyin và nghĩa tham chiếu."
      : "Đã hiện Pinyin tham chiếu. Nghĩa tiếng Việt vẫn đang ẩn.";

  topicFlashcard.innerHTML = `
    <article class="topic-flash-card ${basePassed ? "is-open" : ""} ${sentenceCorrect ? "is-correct" : topicFlashSentenceChecked ? "is-wrong" : ""}">
      <div class="topic-flash-main">
        <p class="section-kicker">FLASH CARD · ${topicFlashIndex + 1}/${reviewPool.length} · ${escapeHtml(getTopicReviewDisplayName())}</p>
        <button class="topic-flash-audio" data-topic-audio="${escapeHtml(word.hanzi)}" type="button">▶ Nghe</button>
        <div class="topic-flash-hanzi" lang="zh-Hans">${escapeHtml(word.hanzi)}</div>
        <div class="topic-flash-hint">
          <button class="topic-meaning-toggle" data-topic-flash-meaning-toggle type="button">
            ${topicFlashMeaningOpen ? "▾ Ẩn gợi nghĩa Việt" : "▸ Hiện gợi nghĩa Việt"}
          </button>
          <div class="topic-flash-meaning-panel" ${topicFlashMeaningOpen ? "" : "hidden"}>
            <p><strong>Bộ ôn:</strong> ${escapeHtml(word.sourceLabel || getTopicReviewDisplayName())}</p>
            <p><strong>Nghĩa:</strong> ${escapeHtml(meaningLabel)}</p>
            <p><strong>Gợi hình:</strong> ${escapeHtml(word.visual)} · ${escapeHtml(word.memory)}</p>
          </div>
        </div>
      </div>
      <form class="topic-flash-form" id="topic-flash-form">
        <div class="topic-flash-mode">
          ${flashModeButtons}
        </div>
        <p class="topic-flash-mode-note">${escapeHtml(flashMode.description)}</p>
        <label ${flashMode.needsPinyin ? "" : "hidden"}>
          <span>GÕ PINYIN</span>
          <input id="topic-flash-pinyin" name="pinyin" type="text" autocomplete="off" value="${escapeHtml(pinyinInput)}" placeholder="Ví dụ: xuéxiào" />
        </label>
        <label ${flashMode.needsMeaning ? "" : "hidden"}>
          <span>GÕ NGHĨA TIẾNG VIỆT</span>
          <input id="topic-flash-meaning" name="meaning" type="text" autocomplete="off" value="${escapeHtml(meaningInput)}" placeholder="Ví dụ: trường học" />
        </label>
        <button class="topic-check-button" type="submit">${flashModeActionLabel}</button>
      </form>
      <div class="topic-flash-feedback" ${showFeedback ? "" : "hidden"}>
        <strong>${feedbackHeadline}</strong>
        ${(topicFlashChecked || revealPinyin) ? `
          <span>${topicFlashChecked ? pinyinCorrect ? "✓" : "•" : "•"} ${topicFlashChecked && flashMode.needsPinyin ? "Pinyin" : "Pinyin tham chiếu"}: <b>${escapeHtml(word.pinyin)}</b></span>
        ` : ""}
        ${(topicFlashChecked && flashMode.needsMeaning) || revealMeaning ? `
          <span>${topicFlashChecked ? meaningCorrect ? "✓" : "•" : "•"} ${topicFlashChecked && flashMode.needsMeaning ? "Nghĩa" : "Nghĩa tham chiếu"}: <b>${escapeHtml(word.meaning)}</b></span>
        ` : ""}
      </div>
      <form class="topic-cloze-form" id="topic-cloze-form" ${basePassed ? "" : "hidden"}>
        <label>
          <span>ĐIỀN TỪ CÒN THIẾU VÀO CÂU</span>
          <strong lang="zh-Hans">${renderTopicSentenceWithBlank(getTopicSentencePrompt(word))}</strong>
          ${topicFlashMeaningOpen
            ? `<small>${escapeHtml(word.sentence?.[2] || "")}</small>`
            : `<button class="topic-inline-toggle" data-topic-flash-meaning-toggle type="button">▸ Hiện dịch Việt</button>`}
          <input id="topic-flash-sentence" name="sentence" type="text" autocomplete="off" value="${escapeHtml(sentenceInput)}" placeholder="Gõ ${escapeHtml(word.hanzi)} hoặc Pinyin..." />
        </label>
        <button class="topic-check-button" type="submit">Kiểm tra câu</button>
      </form>
      <div class="topic-cloze-feedback" ${topicFlashSentenceChecked ? "" : "hidden"}>
        <strong>${sentenceCorrect ? "Đúng câu. Từ này đã được đánh dấu là đã nhớ." : `Thiếu đúng là ${escapeHtml(word.hanzi)}.`}</strong>
        <span lang="zh-Hans">${renderTopicSentenceWithBlank(getTopicSentencePrompt(word)).replace("<span class=\"topic-blank\">____</span>", `<b>${escapeHtml(word.hanzi)}</b>`)}</span>
        <small>${escapeHtml(word.sentence?.[1] || "")}</small>
      </div>
      <div class="topic-flash-actions">
        <button class="${revealPinyin ? "active" : ""}" data-topic-flash-reveal="pinyin" type="button">Hiện Pinyin</button>
        <button class="${revealMeaning ? "active" : ""}" data-topic-flash-reveal="full" type="button">Hiện Pinyin + nghĩa</button>
        <button data-topic-flash-next type="button">Thẻ tiếp theo →</button>
      </div>
    </article>
  `;
}

function updateTopicListenPinyinValue(value) {
  topicListenInputValue = canonicalizePinyinSurface(value);
}

function checkTopicListenPinyin() {
  const word = getCurrentTopicListenWord();
  if (!word) return;
  topicListenChecked = true;
  topicListenReveal = false;
  if (topicPinyinAnswerMatches(topicListenInputValue, word.pinyin)) {
    setTopicWordKnown(word.hanzi, true);
  }
  renderTopicWorkshop();
}

function revealTopicListenPinyin() {
  const word = getCurrentTopicListenWord();
  if (!word) return;
  topicListenInputValue = word.pinyin;
  topicListenReveal = true;
  topicListenChecked = false;
  renderTopicWorkshop();
}

function nextTopicListenPinyin() {
  const reviewPool = getTopicReviewPool();
  if (!reviewPool.length) return;
  topicListenIndex = (topicListenIndex + 1) % reviewPool.length;
  topicListenInputValue = "";
  topicListenChecked = false;
  topicListenReveal = false;
  renderTopicWorkshop();
}

function checkTopicFlashcard() {
  topicFlashChecked = true;
  topicFlashSentenceChecked = false;
  renderTopicFlashcard();
  const clozeInput = topicFlashcard.querySelector("#topic-flash-sentence");
  if (clozeInput) clozeInput.focus();
}

function revealTopicFlashcard(level = "full") {
  const word = getCurrentTopicWord();
  const pinyinInput = topicFlashcard.querySelector("#topic-flash-pinyin");
  const meaningInput = topicFlashcard.querySelector("#topic-flash-meaning");
  if (pinyinInput && (level === "pinyin" || level === "full")) pinyinInput.value = word.pinyin;
  if (meaningInput && level === "full") meaningInput.value = word.meaning.split(/[;；,，]/)[0].trim();
  topicFlashRevealLevel = level === "full" ? "full" : "pinyin";
  renderTopicFlashcard();
}

function checkTopicFlashSentence() {
  const word = getCurrentTopicWord();
  const sentenceInput = topicFlashcard.querySelector("#topic-flash-sentence")?.value || "";
  const sentenceCorrect = normalizeDictationHanzi(sentenceInput) === normalizeDictationHanzi(word.hanzi)
    || normalizeTopicPinyin(sentenceInput) === normalizeTopicPinyin(word.pinyin);
  topicFlashSentenceChecked = true;
  if (sentenceCorrect) setTopicWordKnown(word.hanzi, true);
  renderTopicWorkshop();
}

function nextTopicFlashcard() {
  const reviewPool = getTopicReviewPool();
  if (!reviewPool.length) return;
  topicFlashIndex = (topicFlashIndex + 1) % reviewPool.length;
  topicFlashChecked = false;
  topicFlashSentenceChecked = false;
  topicFlashMeaningOpen = false;
  topicFlashRevealLevel = "none";
  renderTopicWorkshop();
}

function setTopicFlashMode(mode) {
  if (!getTopicFlashModes()[mode]) return;
  topicFlashMode = mode;
  localStorage.setItem("topicFlashMode", mode);
  topicFlashChecked = false;
  topicFlashSentenceChecked = false;
  topicFlashRevealLevel = "none";
  renderTopicFlashcard();
}

function toggleTopicFlashMeaning() {
  topicFlashMeaningOpen = !topicFlashMeaningOpen;
  renderTopicFlashcard();
}

function renderTopicStagePanel(overviewGroup) {
  if (!overviewGroup) {
    topicStage.innerHTML = getTopicWorkshopEmptyState(
      "Đang nạp bản đồ chủ đề",
      "Chờ một chút để app gom toàn bộ từ HSK 1-2 theo từng nhóm dễ học."
    );
    return;
  }

  const visibleWords = overviewGroup.words.slice(0, topicOverviewVisibleLimit);
  const remainingCount = Math.max(0, overviewGroup.words.length - visibleWords.length);
  const wordMarkup = visibleWords.map((word) => {
    const known = isTopicWordKnown(word.hanzi);
    const hasRealExample = word.sentence?.[0] && !String(word.sentence[0]).startsWith("请写：");
    const chunkHanzi = word.chunk || word.sentence?.[0] || word.hanzi;
    return `
      <article class="topic-overview-word-card ${known ? "is-known" : ""}">
        <div class="topic-overview-word-head">
          <strong lang="zh-Hans">${escapeHtml(word.hanzi)}</strong>
          <span class="topic-overview-level">HSK ${word.level || "1-2"}</span>
        </div>
        <span class="topic-overview-pinyin">${escapeHtml(word.pinyin)}</span>
        ${topicStageMeaningVisible ? `<p class="topic-overview-meaning">${escapeHtml(getTopicMeaningLabel(word.meaning))}</p>` : ""}
        <div class="topic-overview-example">
          <span>Chunk để ráp câu</span>
          <strong lang="zh-Hans">${escapeHtml(chunkHanzi)}</strong>
          ${hasRealExample ? `<em lang="zh-Hans">${escapeHtml(word.sentence[0])}</em>` : ""}
          ${hasRealExample ? `<small>${escapeHtml(word.sentence[1])}</small>` : `<small class="topic-overview-note">Nhóm: ${escapeHtml(overviewGroup.shortLabel)}</small>`}
          ${topicStageMeaningVisible
            ? `<small class="topic-overview-translation">${escapeHtml(word.sentence?.[2] || getTopicMeaningLabel(word.meaning))}</small>`
            : ""}
        </div>
        <div class="topic-overview-actions">
          <button class="topic-audio-button" data-topic-audio="${escapeHtml(word.hanzi)}" type="button">▶ Nghe</button>
          <button data-topic-known="${escapeHtml(word.hanzi)}" type="button">${known ? "Đã nhớ" : "Đánh dấu đã nhớ"}</button>
          <button data-topic-lookup="${escapeHtml(word.hanzi)}" type="button">Mở thẻ từ</button>
        </div>
      </article>
    `;
  }).join("");

  topicStage.innerHTML = `
    <article class="topic-scene-card topic-overview-scene-card">
      <div class="topic-scene-mark" lang="zh-Hans">${escapeHtml(overviewGroup.sceneHanzi)}</div>
      <div>
        <div class="topic-overview-hero-head">
          <div>
            <p class="section-kicker">XEM TOÀN BỘ TỪ THEO CHỦ ĐỀ</p>
            <h3>${escapeHtml(overviewGroup.label)}</h3>
          </div>
          <button class="topic-translation-toggle ${topicStageMeaningVisible ? "active" : ""}" data-topic-stage-meaning-toggle type="button">
            <span aria-hidden="true">&#128065;</span>
            ${topicStageMeaningVisible ? "Ẩn dịch Việt" : "Hiện dịch Việt"}
          </button>
        </div>
        <p>${escapeHtml(overviewGroup.sceneNote)}</p>
        <div class="topic-overview-meta">
          <strong>${overviewGroup.count} từ</strong>
          <span>HSK 1: ${overviewGroup.hsk1Count} · HSK 2: ${overviewGroup.hsk2Count}</span>
        </div>
      </div>
    </article>
    <div class="topic-overview-summary">
      <strong>Đang hiện ${visibleWords.length}/${overviewGroup.words.length} từ của chủ đề này</strong>
      <span>${escapeHtml(overviewGroup.sceneTitle)}</span>
      <small>${topicStageMeaningVisible ? "Dịch Việt đang mở cho nghĩa từ và phần chunk." : "Nghĩa Việt đang ẩn. Bấm nút con mắt để hiện nghĩa từ và phần chunk."}</small>
    </div>
    <section class="topic-overview-word-board" aria-label="Toàn bộ từ của chủ đề đang chọn">
      ${wordMarkup}
    </section>
    ${remainingCount ? `
      <div class="topic-overview-more">
        <button class="topic-next-button" data-topic-overview-more type="button">Xem thêm ${Math.min(24, remainingCount)} từ</button>
      </div>
    ` : ""}
  `;
}

function renderTopicWorkshop() {
  const reviewPool = getTopicReviewPool();
  const knownCount = reviewPool.filter((word) => isTopicWordKnown(word.hanzi)).length;
  const percent = reviewPool.length ? Math.round((knownCount / reviewPool.length) * 100) : 0;
  const activePanel = normalizeTopicPanel(activeTopicPanel);
  const overviewGroup = activePanel === "stage" ? getActiveTopicOverviewGroup() : null;

  renderTopicFilter(reviewPool);
  topicReviewControls.hidden = true;
  topicReviewControls.innerHTML = "";
  topicMastery.innerHTML = `
    <span>
      <strong>${knownCount}/${reviewPool.length || 0}</strong> từ đã nhớ trong bộ đang ôn
      <small>${escapeHtml(getTopicReviewSourceSummary())}</small>
    </span>
    <div class="topic-progress" aria-label="Tiến độ nhớ từ"><i style="width: ${percent}%"></i></div>
  `;
  renderTopicPanelSwitcher();
  if (activePanel === "listen") renderTopicListenPinyin(reviewPool);
  if (activePanel === "flashcard") renderTopicFlashcard(reviewPool);
  if (activePanel === "choice") renderTopicChoice(reviewPool);
  if (activePanel === "stage") renderTopicStagePanel(overviewGroup);
  if (activePanel === "drill") renderTopicDrill(reviewPool);
  applyTopicPanelVisibility();
}

function renderTopicChoice(reviewPool = getTopicReviewPool()) {
  const word = getCurrentTopicChoiceWord(reviewPool);
  if (!word) {
    topicChoice.innerHTML = getTopicWorkshopEmptyState(
      "Đang nạp bài chọn đáp án",
      "Khi bộ từ sẵn sàng, phần nhìn chữ chọn nghĩa sẽ hiện ngay ở đây."
    );
    return;
  }
  if (!topicChoiceOptions.length
    || !topicChoiceOptions.includes(word.hanzi)
    || topicChoiceOptions.some((hanzi) => !reviewPool.some((item) => item.hanzi === hanzi))) {
    resetTopicChoiceOptions(reviewPool);
  }
  const isCorrect = topicChoiceAnswered && topicChoiceSelected === word.hanzi;
  const choiceModeButtons = [
    ["pinyin", "Pinyin"],
    ["full", "Pinyin + Việt"]
  ].map(([mode, label]) => `
    <button class="${topicChoiceDisplayMode === mode ? "active" : ""}" data-topic-choice-mode="${mode}" type="button">
      ${escapeHtml(label)}
    </button>
  `).join("");
  const reviewPoolMap = new Map(reviewPool.map((item) => [item.hanzi, item]));
  const options = topicChoiceOptions.map((hanzi) => {
    const optionWord = reviewPoolMap.get(hanzi);
    if (!optionWord) return "";
    const isSelected = hanzi === topicChoiceSelected;
    const isAnswer = hanzi === word.hanzi;
    const className = topicChoiceAnswered
      ? isAnswer ? "is-correct" : isSelected ? "is-wrong" : ""
      : "";
    return `
      <button class="${className}" data-topic-choice-answer="${escapeHtml(hanzi)}" type="button" ${topicChoiceAnswered ? "disabled" : ""}>
        ${escapeHtml(getTopicChoiceOptionLabel(optionWord))}
      </button>
    `;
  }).join("");

  topicChoice.innerHTML = `
    <article class="topic-choice-card ${topicChoiceAnswered ? isCorrect ? "is-correct" : "is-wrong" : ""}">
      <div class="topic-choice-head">
        <div>
          <p class="section-kicker">NHÌN CHỮ CHỌN NGHĨA · ${topicChoiceIndex + 1}/${reviewPool.length}</p>
          <span>${topicChoiceOptions.length} đáp án lấy từ bộ bạn đang tick</span>
        </div>
      </div>
      <div class="topic-choice-toolbar">
        <small>ĐÁP ÁN HIỆN THEO</small>
        <div class="topic-choice-mode">
          ${choiceModeButtons}
        </div>
      </div>
      <div class="topic-choice-prompt">
        <button class="topic-audio-button" data-topic-audio="${escapeHtml(word.hanzi)}" type="button">▶ Nghe</button>
        <small>Chữ hỏi chỉ hiện Hán tự. Nhìn chữ rồi chọn đáp án đúng trong bộ ${escapeHtml(getTopicReviewDisplayName())}.</small>
        <div class="topic-choice-hanzi-row">
          <strong lang="zh-Hans">${escapeHtml(word.hanzi)}</strong>
          <button class="topic-next-button topic-choice-next-button" data-topic-choice-next type="button">${topicChoiceAnswered ? "Từ tiếp theo" : "Bỏ qua từ này"}</button>
        </div>
      </div>
      <div class="topic-choice-options">${options}</div>
      <div class="topic-choice-feedback" ${topicChoiceAnswered ? "" : "hidden"}>
        <strong>${isCorrect ? "Đúng rồi, bạn nối được chữ với nghĩa khá chắc." : `Chưa khớp. ${escapeHtml(word.hanzi)} là ${escapeHtml(getTopicMeaningLabel(word.meaning))}.`}</strong>
        <span>${escapeHtml(word.pinyin)} · ${escapeHtml(getTopicMeaningLabel(word.meaning))}</span>
        <small class="topic-choice-feedback-chunk"><span>Chunk:</span> <b lang="zh-Hans">${escapeHtml(word.chunk)}</b></small>
      </div>
    </article>
  `;
}

function answerTopicChoice(hanzi) {
  if (topicChoiceAnswered) return;
  const word = getCurrentTopicChoiceWord();
  if (!word) return;
  const topicChoiceAudioButton = topicChoice.querySelector(".topic-audio-button");
  if (topicChoiceAudioButton) playTopicAudio(word.hanzi, topicChoiceAudioButton);
  topicChoiceSelected = hanzi;
  topicChoiceAnswered = true;
  if (hanzi === word.hanzi) setTopicWordKnown(word.hanzi, true);
  renderTopicWorkshop();
}

function nextTopicChoice() {
  const reviewPool = getTopicReviewPool();
  if (!reviewPool.length) return;
  const choiceOrder = ensureTopicChoiceOrder(reviewPool);
  if (!choiceOrder.length) return;
  if (topicChoiceIndex + 1 >= choiceOrder.length) {
    const lastHanzi = choiceOrder[choiceOrder.length - 1];
    const nextOrder = buildTopicChoiceOrder(reviewPool, lastHanzi);
    topicChoiceOrder = nextOrder;
    topicChoiceOrderKey = getTopicChoicePoolKey(reviewPool);
    topicChoiceIndex = 0;
  } else {
    topicChoiceIndex += 1;
  }
  topicChoiceSelected = "";
  topicChoiceAnswered = false;
  topicChoiceOptions = [];
  renderTopicWorkshop();
}

function setTopicChoiceDisplayMode(mode) {
  if (!["pinyin", "full"].includes(mode)) return;
  topicChoiceDisplayMode = mode;
  localStorage.setItem("topicChoiceDisplayMode", mode);
  renderTopicChoice();
}

function renderTopicDrill(reviewPool = getTopicReviewPool()) {
  const drill = getTopicDrillData(reviewPool);
  if (!drill) {
    topicDrill.innerHTML = getTopicWorkshopEmptyState(
      "Đang nạp bài ghép câu",
      "App sẽ đưa từ bạn chọn vào ô trống ngay khi bộ dữ liệu sẵn sàng."
    );
    return;
  }
  const isCorrect = topicDrillAnswered && topicDrillSelected === drill.answer;
  const options = drill.options.map((option) => {
    const isSelected = option === topicDrillSelected;
    const isAnswer = option === drill.answer;
    const className = topicDrillAnswered
      ? isAnswer ? "is-correct" : isSelected ? "is-wrong" : ""
      : "";
    return `<button class="${className}" data-topic-drill-answer="${escapeHtml(option)}" type="button" ${topicDrillAnswered ? "disabled" : ""}>${escapeHtml(option)}</button>`;
  }).join("");

  topicDrill.innerHTML = `
    <article class="topic-drill-card ${topicDrillAnswered ? isCorrect ? "is-correct" : "is-wrong" : ""}">
      <div>
        <p class="section-kicker">GHÉP TỪ VÀO CÂU · ${topicDrillIndex + 1}/${drill.total}</p>
        <h3>${renderTopicSentenceWithBlank(drill.prompt)}</h3>
        <button class="topic-inline-toggle" data-topic-drill-meaning-toggle type="button">
          ${topicDrillMeaningOpen ? "▾ Ẩn dịch Việt" : "▸ Hiện dịch Việt"}
        </button>
        <small ${topicDrillMeaningOpen ? "" : "hidden"}>${escapeHtml(drill.meaning)}</small>
        <small class="topic-drill-note">${escapeHtml(drill.detail || "")}</small>
      </div>
      <div class="topic-drill-options">${options}</div>
      <div class="topic-drill-feedback" ${topicDrillAnswered ? "" : "hidden"}>
        <strong>${isCorrect ? "Đúng rồi, đưa từ vào chunk như vậy là tự nhiên." : `Chưa khớp. Đáp án nên là ${escapeHtml(drill.answer)}.`}</strong>
        <span lang="zh-Hans">${renderTopicSentenceWithBlank(drill.prompt).replace("<span class=\"topic-blank\">____</span>", `<b>${escapeHtml(drill.answer)}</b>`)}</span>
      </div>
      <button class="topic-next-button" data-topic-drill-next type="button">${topicDrillAnswered ? "Câu ghép tiếp theo" : "Bỏ qua câu này"}</button>
    </article>
  `;
}

function answerTopicDrill(answer) {
  if (topicDrillAnswered) return;
  const drill = getTopicDrillData();
  if (!drill) return;
  topicDrillSelected = answer;
  topicDrillAnswered = true;
  if (answer === drill.answer) setTopicWordKnown(answer, true);
  renderTopicWorkshop();
}

function nextTopicDrill() {
  const total = getTopicDrillTotal();
  if (!total) return;
  topicDrillIndex = (topicDrillIndex + 1) % total;
  topicDrillSelected = "";
  topicDrillAnswered = false;
  topicDrillMeaningOpen = false;
  renderTopicDrill();
}

function toggleTopicDrillMeaning() {
  topicDrillMeaningOpen = !topicDrillMeaningOpen;
  renderTopicDrill();
}

function toggleTopicStageMeaning() {
  topicStageMeaningVisible = !topicStageMeaningVisible;
  localStorage.setItem("topicStageMeaningVisible", String(topicStageMeaningVisible));
  renderTopicWorkshop();
}

function selectTopicOverview(topicId) {
  setActiveTopicOverview(topicId);
  activeTopicPanel = "stage";
  saveTopicPanelPreference();
  renderTopicWorkshop();
}

function playTopicAudio(hanzi, button) {
  const hskWord = hskVocabulary.find((word) => word.hanzi === hanzi);
  if (hskWord?.audio) {
    playHskAudio(hskWord.audio, button);
    return;
  }
  speakChinese(hanzi, 0.76);
}

function openTopicWord(hanzi) {
  const hskWord = hskVocabulary.find((word) => word.hanzi === hanzi);
  if (hskWord) {
    openHskWord(hanzi);
    return;
  }
  const word = words.find((item) => item.hanzi === hanzi);
  if (word) openWord(hanzi);
}

function parseDictationTime(value) {
  const clean = String(value || "").trim().replace(",", ".");
  const parts = clean.split(":").map((part) => part.trim());
  let seconds = null;
  if (parts.length === 3) {
    seconds = Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  } else if (parts.length === 2) {
    seconds = Number(parts[0]) * 60 + Number(parts[1]);
  } else {
    seconds = Number(clean);
  }
  return Number.isFinite(seconds) ? seconds : null;
}

function parseDictationAnswerLine(line) {
  const parts = String(line || "")
    .replace(/<[^>]+>/g, "")
    .split(/\s*[|｜]\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    hanzi: parts[0] || String(line || "").trim(),
    pinyin: parts[1] || "",
    meaning: parts.slice(2).join(" | "),
  };
}

function parseTimedDictationTranscript(text) {
  const content = String(text || "")
    .replace(/\r/g, "")
    .replace(/^\s*WEBVTT[^\n]*\n+/i, "")
    .trim();
  if (!content) return [];

  const items = [];
  content.split(/\n{2,}/).forEach((block) => {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const timeLineIndex = lines.findIndex((line) => line.includes("-->"));
    if (timeLineIndex < 0) return;
    const [startRaw, endRaw] = lines[timeLineIndex].split("-->").map((part) => part.trim().split(/\s+/)[0]);
    const start = parseDictationTime(startRaw);
    const end = parseDictationTime(endRaw);
    const textLines = lines.slice(timeLineIndex + 1).join(" ").trim();
    if (!textLines || start === null || end === null || end <= start) return;
    items.push({ ...parseDictationAnswerLine(textLines), start, end });
  });
  return items;
}

function parsePlainDictationTranscript(text) {
  return String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line && !line.includes("-->") && !/^\d+$/.test(line))
    .map((line) => ({ ...parseDictationAnswerLine(line), start: null, end: null }));
}

function parseDictationTranscript(text) {
  const timedItems = parseTimedDictationTranscript(text);
  return timedItems.length ? timedItems : parsePlainDictationTranscript(text);
}

function normalizeDictationHanzi(value) {
  return String(value || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\s，。！？、,.!?;；：“”"'‘’（）()[\]{}<>《》]/g, "");
}

function normalizeDictationPinyin(value) {
  return normalize(String(value || ""))
    .replace(/[ǖǘǚǜü]/gi, "u")
    .replace(/[^a-z0-9]/g, "");
}

function getDictationItemLabel(item) {
  const timeLabel = item.start !== null && item.end !== null
    ? `${formatDictationTime(item.start)} → ${formatDictationTime(item.end)}`
    : "không có mốc giờ";
  return timeLabel;
}

function formatDictationTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const millis = Math.round((totalSeconds % 1) * 10);
  return `${minutes}:${String(seconds).padStart(2, "0")}${millis ? `.${millis}` : ""}`;
}

function resetDictationPlayingButton() {
  if (dictationPlayingButton) {
    dictationPlayingButton.classList.remove("is-playing");
    dictationPlayingButton.textContent = "▶ Nghe";
  }
  dictationPlayingButton = null;
}

function stopDictationAudio() {
  dictationSegmentEnd = null;
  dictationActiveIndex = -1;
  dictationAudio.pause();
  resetDictationPlayingButton();
}

function loadDictationAudioFile() {
  const file = dictationAudioFile.files?.[0];
  if (!file) return false;
  if (dictationAudioUrl) URL.revokeObjectURL(dictationAudioUrl);
  dictationAudioUrl = URL.createObjectURL(file);
  dictationAudio.src = dictationAudioUrl;
  dictationAudio.load();
  dictationStatus.textContent = `${file.name} · audio người thật`;
  return true;
}

function renderDictationList() {
  if (!dictationItems.length) {
    dictationList.innerHTML = "";
    return;
  }

  dictationList.innerHTML = dictationItems.map((item, index) => `
    <article class="dictation-card" data-dictation-card="${index}">
      <div class="dictation-card-head">
        <span>Câu ${index + 1}</span>
        <small>${escapeHtml(getDictationItemLabel(item))}</small>
      </div>
      <button class="dictation-play-button" data-dictation-play="${index}" type="button">▶ Nghe</button>
      <label class="dictation-answer-box">
        <span>Bạn nghe được gì?</span>
        <input data-dictation-answer="${index}" type="text" autocomplete="off" placeholder="Gõ Hán tự hoặc Pinyin..." />
      </label>
      <div class="dictation-card-actions">
        <button data-dictation-check="${index}" type="button">Kiểm tra</button>
        <button data-dictation-reveal="${index}" type="button">Hiện đáp án</button>
      </div>
      <div class="dictation-feedback" data-dictation-feedback="${index}" hidden></div>
    </article>
  `).join("");
}

function buildDictationPractice() {
  const hasAudio = loadDictationAudioFile() || Boolean(dictationAudio.src);
  dictationItems = parseDictationTranscript(dictationTranscript.value);
  stopDictationAudio();

  if (!hasAudio) {
    dictationSummary.textContent = "Bạn cần chọn file audio người thật trước.";
    dictationList.innerHTML = "";
    return;
  }
  if (!dictationItems.length) {
    dictationSummary.textContent = "Bạn cần dán transcript hoặc SRT/VTT để tạo bài.";
    dictationList.innerHTML = "";
    return;
  }

  const timedCount = dictationItems.filter((item) => item.start !== null && item.end !== null).length;
  dictationSummary.textContent = timedCount
    ? `Đã tạo ${dictationItems.length} câu, trong đó ${timedCount} câu có mốc giờ để phát từng đoạn.`
    : `Đã tạo ${dictationItems.length} câu. Transcript chưa có mốc giờ nên nút nghe sẽ phát cả file.`;
  dictationImport.open = false;
  renderDictationList();
}

function playDictationItem(index, button) {
  const item = dictationItems[index];
  if (!item || !dictationAudio.src) return;

  stopQuizAudio();
  stopRecordedAudio();
  window.speechSynthesis?.cancel();
  resetDictationPlayingButton();

  dictationActiveIndex = index;
  dictationPlayingButton = button;
  dictationSegmentStart = item.start ?? 0;
  dictationSegmentEnd = item.end;
  dictationAudio.currentTime = dictationSegmentStart;
  button.classList.add("is-playing");
  button.textContent = "= Đang nghe";
  dictationStatus.textContent = item.start !== null && item.end !== null
    ? `Đang phát câu ${index + 1}: ${getDictationItemLabel(item)}`
    : `Đang phát cả file cho câu ${index + 1}`;
  dictationAudio.play().catch(resetDictationPlayingButton);
}

function revealDictationAnswer(index, isCorrect = null) {
  const item = dictationItems[index];
  const card = dictationList.querySelector(`[data-dictation-card="${index}"]`);
  const feedback = dictationList.querySelector(`[data-dictation-feedback="${index}"]`);
  if (!item || !card || !feedback) return;

  card.classList.toggle("is-correct", isCorrect === true);
  card.classList.toggle("is-wrong", isCorrect === false);
  const verdict = isCorrect === true
    ? "Đúng rồi."
    : isCorrect === false
      ? "Chưa khớp, xem lại đoạn này."
      : "Đáp án:";
  feedback.innerHTML = `
    <strong>${verdict}</strong>
    <span lang="zh-Hans">${escapeHtml(item.hanzi)}</span>
    ${item.pinyin ? `<small>${escapeHtml(item.pinyin)}</small>` : ""}
    ${item.meaning ? `<em>${escapeHtml(item.meaning)}</em>` : ""}
  `;
  feedback.hidden = false;
}

function checkDictationAnswer(index) {
  const item = dictationItems[index];
  const input = dictationList.querySelector(`[data-dictation-answer="${index}"]`);
  if (!item || !input) return;
  const answer = input.value.trim();
  const hanziMatch = normalizeDictationHanzi(answer) === normalizeDictationHanzi(item.hanzi);
  const pinyinMatch = item.pinyin && normalizeDictationPinyin(answer) === normalizeDictationPinyin(item.pinyin);
  revealDictationAnswer(index, Boolean(hanziMatch || pinyinMatch));
}

function clearDictationPractice() {
  stopDictationAudio();
  if (dictationAudioUrl) URL.revokeObjectURL(dictationAudioUrl);
  dictationAudioUrl = "";
  dictationItems = [];
  dictationAudio.removeAttribute("src");
  dictationAudio.load();
  dictationAudioFile.value = "";
  dictationTranscript.value = "";
  dictationImport.open = true;
  dictationStatus.textContent = "Chưa nạp audio";
  dictationSummary.textContent = "Chọn file audio người thật và dán transcript để tạo bài.";
  dictationList.innerHTML = "";
}

function renderComponentAnalysis(components) {
  if (!components) return "";

  const renderComponent = (component, roleClass = "") => `
    <article class="component-card ${roleClass}">
      <div class="component-symbol" lang="zh-Hans">${component[0]}</div>
      <div>
        <p class="component-reading">${component[1]}</p>
        <h4>${component[2]}</h4>
        <p>${component[3]}</p>
      </div>
    </article>
  `;

  if (components.items) {
    return `
      <section class="detail-section full-width component-section">
        <p class="detail-label">Tách từng thành phần</p>
        <h3>${components.title}</h3>
        <p class="component-note">${components.note}</p>
        <div class="component-grid">
          ${components.items.map((item, index) => renderComponent(item, index === 0 ? "meaning-component" : "sound-component")).join("")}
        </div>
      </section>
    `;
  }

  return `
    <section class="detail-section full-width component-section">
      <p class="detail-label">Tách từng thành phần</p>
      <h3>Nghĩa và âm làm hai nhiệm vụ khác nhau</h3>
      <p class="component-note">
        Hình tượng của phần gợi âm giúp nhớ chính thành phần đó và cách đọc. Nó không tự động tạo nên nghĩa của chữ chính.
      </p>
      <div class="component-grid">
        ${renderComponent(components.meaning, "meaning-component")}
        ${renderComponent(components.sound, "sound-component")}
      </div>
    </section>
  `;
}

function renderPhraseAnalysis(word) {
  const analysis = word.phraseAnalysis;
  const characterCards = analysis.characters.map((character) => {
    const sourceUrl = `https://www.dong-chinese.com/wiki/${encodeURIComponent(character.source)}`;
    return `
      <article class="phrase-character-card">
        <div class="phrase-character-head">
          <span class="phrase-character" lang="zh-Hans">${character.hanzi}</span>
          <div>
            <strong>${character.pinyin}</strong>
            <span>${character.type}</span>
          </div>
        </div>
        <p>${character.origin}</p>
        <div class="phrase-memory"><strong>Mẹo nhớ:</strong> ${character.memory}</div>
        <a class="phrase-source-link" href="${sourceUrl}" target="_blank" rel="noreferrer">Xem nguồn chữ ${character.hanzi} ↗</a>
      </article>
    `;
  }).join("");

  const extensionItems = analysis.extensions.map(([hanzi, pinyin, meaning]) => `
    <li class="phrase-extension-item">
      <strong lang="zh-Hans">${hanzi}</strong>
      <span>${pinyin}</span>
      <small>${meaning}</small>
      <button class="phrase-listen-button" data-speak="${hanzi}" type="button" aria-label="Nghe ${hanzi}">▶</button>
    </li>
  `).join("");

  return `
    <div class="dialog-hero phrase-dialog-hero">
      <div class="dialog-character" lang="zh-Hans">${word.hanzi}</div>
      <div class="dialog-intro">
        <p class="dialog-topic">${categories[word.category]} · ${word.type}</p>
        <h2>${word.meaning}</h2>
        <p class="dialog-pinyin">${word.pinyin}</p>
        <div class="dialog-actions">
          <button class="speak-button" data-speak="${word.hanzi}">▶ Nghe phát âm</button>
        </div>
      </div>
    </div>
    <div class="dialog-body phrase-dialog-body">
      <section class="detail-section">
        <p class="detail-label">Cấu trúc ghép từ</p>
        <h3>${word.type}</h3>
        <p>${analysis.structure}</p>
      </section>
      <section class="detail-section">
        <p class="detail-label">Ngữ pháp và cách dùng</p>
        <h3>Dùng thế nào cho tự nhiên?</h3>
        <p>${analysis.grammar}</p>
      </section>
      <section class="detail-section full-width phrase-character-section">
        <p class="detail-label">Tách từng chữ</p>
        <h3>Nguồn gốc và mẹo nhớ là hai phần riêng</h3>
        <p class="phrase-section-note">Mỗi thẻ giải thích hình thể có căn cứ trước, rồi mới đưa mẹo liên tưởng để ghi nhớ.</p>
        <div class="phrase-character-grid">${characterCards}</div>
      </section>
      <section class="detail-section full-width mnemonic-box">
        <p class="detail-label">Từ và cụm mở rộng</p>
        <ul class="phrase-extension-list">${extensionItems}</ul>
      </section>
      <section class="detail-section full-width">
        <p class="detail-label">Câu ví dụ thông dụng</p>
        <div class="example-sentence">
          <strong lang="zh-Hans">${word.sentence[0]}</strong>
          <span>${word.sentence[1]}</span>
          <small>${word.sentence[2]}</small>
        </div>
      </section>
    </div>
  `;
}

function openWord(hanzi) {
  const word = words.find((item) => item.hanzi === hanzi);
  if (!word) return;

  if (word.phraseAnalysis) {
    dialogContent.innerHTML = renderPhraseAnalysis(word);
    if (dialog.open) dialog.close();
    dialog.showModal();
    return;
  }

  const sourceUrl = `https://www.dong-chinese.com/wiki/${encodeURIComponent(word.sourceChar)}`;
  dialogContent.innerHTML = `
    <div class="dialog-hero">
      <div class="dialog-character" lang="zh-Hans">${word.hanzi}</div>
      <div class="dialog-intro">
        <p class="dialog-topic">${categories[word.category]} · ${word.type}</p>
        <h2>${word.meaning}</h2>
        <p class="dialog-pinyin">${word.pinyin}</p>
        <p class="dialog-meaning">Hán Việt: ${word.sino}</p>
        <div class="dialog-actions">
          <button class="speak-button" data-speak="${word.hanzi}">▶ Nghe phát âm</button>
          <a class="source-link" href="${sourceUrl}" target="_blank" rel="noreferrer">Xem nguồn chữ ↗</a>
        </div>
      </div>
    </div>
    <div class="dialog-body">
      <section class="detail-section">
        <p class="detail-label">Cấu tạo chữ</p>
        <h3>${word.type}</h3>
        <p>${word.breakdown}</p>
      </section>
      <section class="detail-section">
        <p class="detail-label">Nguồn gốc</p>
        <h3>Chữ đã hình thành thế nào?</h3>
        <p>${word.origin}</p>
      </section>
      ${renderComponentAnalysis(word.components)}
      <section class="detail-section full-width mnemonic-box">
        <p class="detail-label">Mẹo liên tưởng</p>
        <h3>Hình ảnh để nhớ</h3>
        <p>${word.mnemonic}</p>
      </section>
      <section class="detail-section full-width">
        <p class="detail-label">${word.category === "social" ? "Câu giao tiếp thường gặp" : "Câu HSK 1 thường gặp"}</p>
        <div class="example-sentence">
          <strong lang="zh-Hans">${word.sentence[0]}</strong>
          <span>${word.sentence[1]}</span>
          <small>${word.sentence[2]}</small>
        </div>
      </section>
    </div>
  `;

  if (dialog.open) dialog.close();
  dialog.showModal();
}

function resetHskPlayerButton() {
  if (!hskPlayingButton) return;
  hskPlayingButton.classList.remove("is-playing");
  if (hskPlayingButton.classList.contains("topic-audio-button")) {
    hskPlayingButton.textContent = "▶ Nghe";
  } else if (!hskPlayingButton.classList.contains("pinyin-contrast-audio")) {
    hskPlayingButton.textContent = "▶";
  }
  hskPlayingButton = null;
}

function playHskAudio(path, button) {
  hskPlayer.pause();
  hskPlayer.currentTime = 0;
  resetHskPlayerButton();
  stopQuizAudio();
  stopRecordedAudio();
  window.speechSynthesis?.cancel();

  hskPlayingButton = button;
  button.classList.add("is-playing");
  if (button.classList.contains("topic-audio-button")) {
    button.textContent = "= Nghe";
  } else if (!button.classList.contains("pinyin-contrast-audio")) {
    button.textContent = "=";
  }
  hskPlayer.src = path;
  hskPlayer.play().catch(resetHskPlayerButton);
}

function getSentencesForWord(word) {
  return commonSentenceData.sentences
    .filter((sentence) => sentence.hanzi.includes(word.hanzi))
    .slice(0, 3);
}

function openHskWord(hanzi) {
  const word = hskVocabulary.find((item) => item.hanzi === hanzi);
  if (!word) return;

  const examples = getSentencesForWord(word);
  const exampleMarkup = examples.length
    ? examples.map((sentence) => `
        <div class="example-sentence">
          <strong lang="zh-Hans">${escapeHtml(sentence.hanzi)}</strong>
          <span>${escapeHtml(sentence.pinyin)}</span>
          <small>${escapeHtml(sentence.meaning)}</small>
        </div>
      `).join("")
    : `<p class="hsk-source-note">Chưa có câu mẫu trong bộ 80 câu cho từ này.</p>`;

  dialogContent.innerHTML = `
    <div class="dialog-hero">
      <div class="dialog-character" lang="zh-Hans">${escapeHtml(word.hanzi)}</div>
      <div class="dialog-intro">
        <p class="dialog-topic">${getHskLevelLabel(word.level)} · Tra nhanh</p>
        <h2>${escapeHtml(getConciseMeaning(word))}</h2>
        <p class="dialog-pinyin">${escapeHtml(word.pinyin)}</p>
        <div class="dialog-actions">
          <audio class="hsk-dialog-player" src="${escapeHtml(word.audio)}" controls preload="metadata"></audio>
          <button class="source-link" data-lookup-pinyin="${escapeHtml(word.pinyin)}" type="button">Tra âm này trong app</button>
        </div>
      </div>
    </div>
    <div class="dialog-body">
      <section class="detail-section full-width">
        <p class="detail-label">Câu giao tiếp có từ này</p>
        <h3>Nghe và đọc trong ngữ cảnh</h3>
        ${exampleMarkup}
      </section>
      <section class="detail-section full-width">
        <p class="detail-label">Phạm vi dữ liệu</p>
        <h3>Kho tra nhanh, không phải phân tích nguồn gốc chữ</h3>
        <p class="hsk-source-note">
          Từ thuộc New HSK 3.0, công bố tháng 11/2025 và có hiệu lực từ tháng 7/2026.
          Âm thanh dùng giọng zh-CN-XiaoxiaoNeural từ gói người dùng cung cấp.
          Muốn học cấu tạo, bộ thủ và mẹo hình tượng có kiểm chứng, hãy dùng khu 45 chữ phân tích chuyên sâu bên dưới.
        </p>
      </section>
    </div>
  `;

  if (dialog.open) dialog.close();
  dialog.showModal();
}

async function loadLearningLibraries() {
  const [hskResponse, sentenceResponse] = await Promise.all([
    fetch("data/hsk-vocabulary.json"),
    fetch("data/common-sentences.json")
  ]);

  if (!hskResponse.ok || !sentenceResponse.ok) {
    throw new Error("Không tải được dữ liệu HSK hoặc câu giao tiếp.");
  }

  const [hskData, sentenceData] = await Promise.all([
    hskResponse.json(),
    sentenceResponse.json()
  ]);
  hskVocabulary = hskData.words || [];
  commonSentenceData = sentenceData;
  if (pinyinDictionaryInput.value.trim()) pinyinDictionaryTone = getRequestedTone(pinyinDictionaryInput.value);
  document.querySelector("#total-count").textContent = hskVocabulary.length;
  renderHskLevelFilter();
  renderHskWords();
  renderPinyinDictionary();
  renderPinyinContrast();
  renderSentenceTopicFilter();
  renderSentences();
  renderTopicWorkshop();
}

function createChineseUtterance(text, rate) {
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "zh-CN";
  utterance.rate = rate;
  const chineseVoice = window.speechSynthesis.getVoices().find((voice) => voice.lang.toLowerCase().startsWith("zh"));
  if (chineseVoice) utterance.voice = chineseVoice;
  return utterance;
}

let finishActiveClip = null;
let audioRunId = 0;

function stopRecordedAudio() {
  audioRunId += 1;
  practiceAudio.pause();
  practiceAudio.currentTime = 0;
  if (finishActiveClip) finishActiveClip();
  finishActiveClip = null;
}

function playRecordedPath(path) {
  return new Promise((resolve) => {
    practiceAudio.src = path;

    const finish = () => {
      if (finishActiveClip === finish) finishActiveClip = null;
      resolve();
    };

    finishActiveClip = finish;
    practiceAudio.onended = finish;
    practiceAudio.onerror = finish;
    practiceAudio.load();
    practiceAudio.play().catch(finish);
  });
}

function speakChinese(text, rate = 0.78) {
  if (!("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(createChineseUtterance(text, rate));
}

async function speakPracticeWord(text) {
  stopQuizAudio();
  stopRecordedAudio();
  window.speechSynthesis?.cancel();
  const word = pronunciationWords.find((item) => item.hanzi === text);
  nowPlaying.textContent = word ? `${word.hanzi} · ${word.pinyin} · ${word.meaning}` : text;
  await playRecordedPath(`audio/practice/${encodeURIComponent(text)}.mp3?v=2`);
}

async function speakInitialGroup() {
  stopQuizAudio();
  stopRecordedAudio();
  window.speechSynthesis?.cancel();
  nowPlaying.textContent = `Nhóm âm ${activeInitial} · ${pronunciationWords.filter((word) => word.initial === activeInitial).length} từ`;
  await playRecordedPath(`audio/groups/${activeInitial}.mp3?v=1`);
}

quizStartButton.addEventListener("click", startQuiz);
quizReplayButton.addEventListener("click", playQuizWord);
quizNextButton.addEventListener("click", nextQuizQuestion);
quizDelayDecrease.addEventListener("click", () => changeQuizDelay(-1));
quizDelayIncrease.addEventListener("click", () => changeQuizDelay(1));
quizAutoAdvance.addEventListener("change", () => {
  quizAutoAdvanceEnabled = quizAutoAdvance.checked;
  localStorage.setItem("quizAutoAdvance", String(quizAutoAdvanceEnabled));
  scheduleQuizAdvance();
});

quizOptions.addEventListener("click", (event) => {
  const button = event.target.closest("[data-quiz-initial]");
  if (!button) return;
  addQuizInitial(button.dataset.quizInitial);
});

quizResult.addEventListener("click", (event) => {
  if (event.target.closest("[data-restart-quiz]")) startQuiz();
});

quizAudio.addEventListener("playing", () => {
  quizReplayButton.classList.add("is-playing");
  quizPlayIcon.textContent = "=";
});
quizAudio.addEventListener("pause", () => {
  quizReplayButton.classList.remove("is-playing");
  quizPlayIcon.textContent = "▶";
});
quizAudio.addEventListener("ended", () => {
  quizReplayButton.classList.remove("is-playing");
  quizPlayIcon.textContent = "▶";
});

dictationAudioFile.addEventListener("change", () => {
  loadDictationAudioFile();
});

dictationBuildButton.addEventListener("click", buildDictationPractice);
dictationClearButton.addEventListener("click", clearDictationPractice);

dictationAudio.addEventListener("timeupdate", () => {
  if (dictationSegmentEnd === null || dictationAudio.currentTime < dictationSegmentEnd) return;
  if (dictationLoop.checked && dictationActiveIndex >= 0) {
    dictationAudio.currentTime = dictationSegmentStart;
    dictationAudio.play().catch(resetDictationPlayingButton);
    return;
  }
  dictationAudio.pause();
  dictationAudio.currentTime = dictationSegmentStart;
  dictationSegmentEnd = null;
  resetDictationPlayingButton();
});

dictationAudio.addEventListener("pause", () => {
  dictationSegmentEnd = null;
  resetDictationPlayingButton();
});

dictationAudio.addEventListener("ended", () => {
  dictationSegmentEnd = null;
  resetDictationPlayingButton();
});

dictationList.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const input = event.target.closest("[data-dictation-answer]");
  if (!input) return;
  event.preventDefault();
  checkDictationAnswer(Number(input.dataset.dictationAnswer));
});

document.addEventListener("submit", (event) => {
  if (event.target.id === "topic-listen-form") {
    event.preventDefault();
    checkTopicListenPinyin();
  }
  if (event.target.id === "topic-flash-form") {
    event.preventDefault();
    checkTopicFlashcard();
  }
  if (event.target.id === "topic-cloze-form") {
    event.preventDefault();
    checkTopicFlashSentence();
  }
});

filters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  activeCategory = button.dataset.category;
  renderFilters();
  renderWords();
});

searchInput.addEventListener("input", renderWords);

headerLookupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  openInternalPinyinLookup(headerLookupInput.value);
});

pinyinDictionaryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  pinyinDictionaryTone = getRequestedTone(pinyinDictionaryInput.value);
  renderPinyinDictionary();
});

pinyinDictionaryInput.addEventListener("input", () => {
  pinyinDictionaryTone = getRequestedTone(pinyinDictionaryInput.value);
  renderPinyinDictionary();
});

pinyinToneFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-pinyin-tone]");
  if (!button) return;
  pinyinDictionaryTone = button.dataset.pinyinTone;
  renderPinyinDictionary();
});

pinyinInitialShortcuts.addEventListener("click", (event) => {
  const button = event.target.closest("[data-pinyin-contrast]");
  if (!button) return;
  pinyinContrastInput.value = button.dataset.pinyinContrast;
  renderPinyinContrast();
});

pinyinContrastInput.addEventListener("input", renderPinyinContrast);

hskSearchInput.addEventListener("input", () => {
  hskVisibleLimit = HSK_PAGE_SIZE;
  renderHskWords();
});

hskLevelFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-hsk-level]");
  if (!button) return;
  hskActiveLevel = button.dataset.hskLevel;
  hskVisibleLimit = HSK_PAGE_SIZE;
  renderHskLevelFilter();
  renderHskWords();
});

hskLoadMore.addEventListener("click", () => {
  hskVisibleLimit += HSK_PAGE_SIZE;
  renderHskWords();
});

sentenceTopicFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-sentence-topic]");
  if (!button) return;
  sentenceActiveTopic = button.dataset.sentenceTopic;
  sentenceVisibleLimit = SENTENCE_PAGE_SIZE;
  renderSentenceTopicFilter();
  renderSentences();
});

sentenceLoadMore.addEventListener("click", () => {
  sentenceVisibleLimit += SENTENCE_PAGE_SIZE;
  renderSentences();
});

questionGuideFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-question-guide-group]");
  if (!button) return;
  activeQuestionGuideGroup = button.dataset.questionGuideGroup;
  renderQuestionGuideFilter();
  renderQuestionGuides();
});

initialFilter.addEventListener("click", (event) => {
  const button = event.target.closest("[data-initial]");
  if (!button) return;
  activeInitial = button.dataset.initial;
  stopRecordedAudio();
  window.speechSynthesis?.cancel();
  renderPronunciationPractice();
});

listenGroupButton.addEventListener("click", speakInitialGroup);

document.addEventListener("click", (event) => {
  const wordButton = event.target.closest("[data-word]");
  const questionButton = event.target.closest("[data-open-word]");
  const speakButton = event.target.closest("[data-speak]");
  const practiceButton = event.target.closest("[data-practice-word]");
  const hskWordButton = event.target.closest("[data-hsk-word]");
  const hskAudioButton = event.target.closest("[data-hsk-audio]");
  const sentenceAudioButton = event.target.closest("[data-sentence-speak]");
  const questionGuideButton = event.target.closest("[data-question-guide]");
  const internalPinyinButton = event.target.closest("[data-lookup-pinyin]");
  const topicOverviewOpenButton = event.target.closest("[data-topic-overview-open]");
  const topicReviewPresetButton = event.target.closest("[data-topic-review-preset]");
  const topicPanelButton = event.target.closest("[data-topic-panel]");
  const topicOverviewMoreButton = event.target.closest("[data-topic-overview-more]");
  const topicAudioButton = event.target.closest("[data-topic-audio]");
  const topicListenRevealButton = event.target.closest("[data-topic-listen-reveal]");
  const topicListenNextButton = event.target.closest("[data-topic-listen-next]");
  const topicKnownButton = event.target.closest("[data-topic-known]");
  const topicLookupButton = event.target.closest("[data-topic-lookup]");
  const topicChoiceModeButton = event.target.closest("[data-topic-choice-mode]");
  const topicChoiceAnswerButton = event.target.closest("[data-topic-choice-answer]");
  const topicChoiceNextButton = event.target.closest("[data-topic-choice-next]");
  const topicDrillAnswerButton = event.target.closest("[data-topic-drill-answer]");
  const topicDrillNextButton = event.target.closest("[data-topic-drill-next]");
  const topicFlashModeButton = event.target.closest("[data-topic-flash-mode]");
  const topicFlashMeaningToggle = event.target.closest("[data-topic-flash-meaning-toggle]");
  const topicFlashRevealButton = event.target.closest("[data-topic-flash-reveal]");
  const topicFlashNextButton = event.target.closest("[data-topic-flash-next]");
  const topicDrillMeaningToggle = event.target.closest("[data-topic-drill-meaning-toggle]");
  const topicStageMeaningToggle = event.target.closest("[data-topic-stage-meaning-toggle]");
  const dictationPlayButton = event.target.closest("[data-dictation-play]");
  const dictationCheckButton = event.target.closest("[data-dictation-check]");
  const dictationRevealButton = event.target.closest("[data-dictation-reveal]");
  const lessonLink = event.target.closest("a[href^='#']");
  if (wordButton) openWord(wordButton.dataset.word);
  if (questionButton) openWord(questionButton.dataset.openWord);
  if (speakButton) speakChinese(speakButton.dataset.speak);
  if (practiceButton) speakPracticeWord(practiceButton.dataset.practiceWord);
  if (hskWordButton) openHskWord(hskWordButton.dataset.hskWord);
  if (hskAudioButton) playHskAudio(hskAudioButton.dataset.hskAudio, hskAudioButton);
  if (sentenceAudioButton) speakChinese(sentenceAudioButton.dataset.sentenceSpeak, 0.72);
  if (questionGuideButton) openQuestionGuide(questionGuideButton.dataset.questionGuide);
  if (topicReviewPresetButton) setTopicReviewPreset(topicReviewPresetButton.dataset.topicReviewPreset);
  if (topicPanelButton) setActiveTopicPanel(topicPanelButton.dataset.topicPanel);
  if (topicOverviewOpenButton) selectTopicOverview(topicOverviewOpenButton.dataset.topicOverviewOpen);
  if (topicOverviewMoreButton) showMoreTopicOverviewWords();
  if (topicAudioButton) playTopicAudio(topicAudioButton.dataset.topicAudio, topicAudioButton);
  if (topicListenRevealButton) revealTopicListenPinyin();
  if (topicListenNextButton) nextTopicListenPinyin();
  if (topicKnownButton) {
    setTopicWordKnown(topicKnownButton.dataset.topicKnown, !isTopicWordKnown(topicKnownButton.dataset.topicKnown));
    renderTopicWorkshop();
  }
  if (topicLookupButton) openTopicWord(topicLookupButton.dataset.topicLookup);
  if (topicChoiceModeButton) setTopicChoiceDisplayMode(topicChoiceModeButton.dataset.topicChoiceMode);
  if (topicChoiceAnswerButton) answerTopicChoice(topicChoiceAnswerButton.dataset.topicChoiceAnswer);
  if (topicChoiceNextButton) nextTopicChoice();
  if (topicDrillAnswerButton) answerTopicDrill(topicDrillAnswerButton.dataset.topicDrillAnswer);
  if (topicDrillNextButton) nextTopicDrill();
  if (topicFlashModeButton) setTopicFlashMode(topicFlashModeButton.dataset.topicFlashMode);
  if (topicFlashMeaningToggle) toggleTopicFlashMeaning();
  if (topicFlashRevealButton) revealTopicFlashcard(topicFlashRevealButton.dataset.topicFlashReveal);
  if (topicFlashNextButton) nextTopicFlashcard();
  if (topicDrillMeaningToggle) toggleTopicDrillMeaning();
  if (topicStageMeaningToggle) toggleTopicStageMeaning();
  if (dictationPlayButton) playDictationItem(Number(dictationPlayButton.dataset.dictationPlay), dictationPlayButton);
  if (dictationCheckButton) checkDictationAnswer(Number(dictationCheckButton.dataset.dictationCheck));
  if (dictationRevealButton) revealDictationAnswer(Number(dictationRevealButton.dataset.dictationReveal));
  if (internalPinyinButton) {
    dialog.close();
    openInternalPinyinLookup(internalPinyinButton.dataset.lookupPinyin);
  }
  if (lessonLink) {
    const targetId = lessonLink.getAttribute("href").slice(1);
    if (lessonLabels[targetId]) {
      event.preventDefault();
      history.pushState(null, "", `#${targetId}`);
      showLesson(targetId, { smooth: true });
      lessonMenu.open = false;
    }
  }
  if (lessonMenu.open && !lessonMenu.contains(event.target)) lessonMenu.open = false;
});

window.addEventListener("popstate", () => {
  showLesson(window.location.hash.slice(1), { smooth: false });
});

document.addEventListener("keydown", (event) => {
  const target = event.target;
  const isTopicPinyinInput = target instanceof HTMLInputElement
    && ["topic-listen-pinyin-input", "topic-flash-pinyin"].includes(target.id);
  if (isTopicPinyinInput && /^[1-5]$/.test(event.key)) {
    event.preventDefault();
    const selectionEnd = typeof target.selectionEnd === "number" ? target.selectionEnd : target.value.length;
    const result = applyToneNumberAtCursor(target.value, Number(event.key), selectionEnd);
    target.value = result.value;
    target.setSelectionRange(result.cursor, result.cursor);
    if (target.id === "topic-listen-pinyin-input") {
      updateTopicListenPinyinValue(result.value);
    }
  }
  if (event.key === "Escape" && lessonMenu.open) {
    lessonMenu.open = false;
    lessonMenu.querySelector("summary").focus();
  }
});

document.addEventListener("change", (event) => {
  const topicReviewSource = event.target.closest?.("[data-topic-review-source]");
  if (!topicReviewSource) return;
  setTopicReviewSourceChecked(topicReviewSource.dataset.topicReviewSource, topicReviewSource.checked);
});

document.addEventListener("input", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return;
  if (!["topic-listen-pinyin-input", "topic-flash-pinyin"].includes(target.id)) return;
  const formatted = canonicalizePinyinSurface(target.value);
  if (formatted !== target.value) {
    target.value = formatted;
  }
  if (target.id === "topic-listen-pinyin-input") {
    updateTopicListenPinyinValue(target.value);
  }
});

hskPlayer.addEventListener("ended", resetHskPlayerButton);
hskPlayer.addEventListener("error", resetHskPlayerButton);

closeButton.addEventListener("click", () => dialog.close());
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) dialog.close();
});

document.querySelector("#total-count").textContent = "988";
renderFilters();
renderWords();
renderPronunciationPractice();
renderInterrogativeGuides();
renderQuestionGuideFilter();
renderQuestionGuides();
renderPinyinToneFilter();
renderPinyinInitialShortcuts();
renderTopicWorkshop();
initializeLessonView();
loadLearningLibraries().catch((error) => {
  hskResultSummary.textContent = "Không tải được kho từ. Hãy mở trang qua máy chủ local rồi tải lại.";
  sentenceGrid.innerHTML = `<p class="hsk-source-note">${escapeHtml(error.message)}</p>`;
});
