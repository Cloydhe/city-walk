/**
 * data.js —— 静态数据层
 * 包含：关键词题库、城市库（含打卡点与预设文案，作为大模型未配置时的兜底内容）
 * 命名规范：常量全大写下划线分隔；城市/打卡点 id 使用英文小写
 */
(function (global) {
  'use strict';

  /** 五层递进关键词：心情 → 南北 → 地貌 → 特色 → 玩法 */
  var QUIZ_STEPS = [
    {
      key: 'mood',
      title: '此刻的心情是？',
      subtitle: '选一个最贴近你现在状态的词',
      options: ['想慢下来', '想要热闹', '需要治愈', '渴望冒险', '有点怀旧']
    },
    {
      key: 'region',
      title: '想去南方还是北方？',
      subtitle: '气候与气质，先定个大方向',
      options: ['南方暖阳', '北方辽阔', '都可以']
    },
    {
      key: 'terrain',
      title: '偏爱哪种地貌风光？',
      subtitle: '江河湖海，山峦盆地',
      options: ['大海边', '湖泊河流', '高山峡谷', '草原旷野', '平原古城']
    },
    {
      key: 'feature',
      title: '想体验什么地方特色？',
      subtitle: '一座城最地道的味道',
      options: ['地道美食', '历史古迹', '民族风情', '现代都市', '文艺小清新']
    },
    {
      key: 'activity',
      title: '到了想怎么玩？',
      subtitle: '最后一步，想想就开心',
      options: ['拍照打卡', '徒步户外', '逛吃逛吃', '看馆看展', '夜景夜生活', '发呆放空']
    }
  ];

  /**
   * 大模型服务商预设（OpenAI 兼容接口）
   * 选择服务商后自动填充 baseUrl 与可选模型，用户只需填 API Key
   */
  var LLM_PROVIDERS = [
    {
      id: 'deepseek', name: 'DeepSeek 深度求索',
      baseUrl: 'https://api.deepseek.com/v1',
      models: ['deepseek-v4-pro', 'deepseek-v4-flash'],
      keyHint: 'platform.deepseek.com 申请'
    },
    {
      id: 'qwen', name: '通义千问 Qwen（阿里云百炼）',
      baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
      models: ['qwen3.8-max', 'qwen-plus', 'qwen-flash'],
      keyHint: 'bailian.console.aliyun.com 申请'
    },
    {
      id: 'glm', name: '智谱 GLM',
      baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
      models: ['glm-5.3', 'glm-5.3-flash'],
      keyHint: 'open.bigmodel.cn 申请'
    },
    {
      id: 'custom', name: '自定义（OpenAI 兼容）',
      baseUrl: '', models: [],
      keyHint: '任意兼容 /chat/completions 的服务'
    }
  ];

  /**
   * 城市库
   * tags: 与五层关键词对应，用于本地匹配兜底
   * mapX/mapY: 全国地图坐标（viewBox 800x640，按经纬度近似映射：x=(lon-73)/62*800, y=(53.5-lat)/35.5*640）
   * spots[].mapX/mapY: 城市地图坐标（viewBox 420x320），数组顺序即推荐游览顺序
   */
  var CITIES = [
    {
      id: 'chengdu', name: '成都', slogan: '巴适得板，来了就不想走',
      color: '#e8a54b', tags: ['想慢下来', '需要治愈', '南方暖阳', '平原古城', '地道美食', '逛吃逛吃', '发呆放空'],
      mapX: 401, mapY: 413,
      desc: '盖碗茶、火锅和熊猫，这座城市的时钟天生走得慢。',
      spots: [
        { id: 'cd-panda', name: '大熊猫繁育研究基地', short: '看滚滚卖萌要赶早', mapX: 130, mapY: 80,
          intro: '全球最受欢迎的熊猫家园，月亮产房的幼崽区是萌度天花板。',
          tips: '熊猫上午活跃，建议 8:30 前入园；夏季高温时滚滚会回空调房。',
          transport: '地铁3号线熊猫大道站转景区直通车，或打车约30分钟。',
          extra: '园区较大，穿舒服的鞋；网红熊猫"花花"在幼年大熊猫别墅。' },
        { id: 'cd-kuanzhai', name: '宽窄巷子', short: '清代街巷里的慢生活', mapX: 210, mapY: 170,
          intro: '宽巷子闲、窄巷子静、井巷子市井，三条平行老街浓缩了成都的安逸。',
          tips: '主街商业化较重，推荐拐进支巷的小茶馆坐坐。',
          transport: '地铁4号线宽窄巷子站B口直达。',
          extra: '试试三大炮和糖油果子，现做现吃才是灵魂。' },
        { id: 'cd-jinli', name: '锦里古街', short: '三国烟火气，越夜越美丽', mapX: 260, mapY: 230,
          intro: '紧邻武侯祠的明清老街，红灯笼亮起时最有味道。',
          tips: '傍晚亮灯后氛围最佳；小吃浅尝即可，留肚子给正餐。',
          transport: '地铁3号线高升桥站步行10分钟。',
          extra: '顺路可逛武侯祠，红墙竹影是出片圣地。' },
        { id: 'cd-taikoo', name: '春熙路·太古里', short: '时尚与古寺同框', mapX: 320, mapY: 120,
          intro: '千年大慈寺与潮流商圈仅一墙之隔，成都的新旧在这里握手。',
          tips: '爬墙熊猫在 IFS 七楼，合影可能需要排队。',
          transport: '地铁2/3号线春熙路站直达。',
          extra: '方所书店值得专程前往，被称为"地下藏经阁"。' }
      ]
    },
    {
      id: 'chongqing', name: '重庆', slogan: '8D魔幻山城，导航都认输',
      color: '#d95f4b', tags: ['想要热闹', '渴望冒险', '南方暖阳', '高山峡谷', '地道美食', '夜景夜生活', '逛吃逛吃'],
      mapX: 432, mapY: 432,
      desc: '轻轨穿楼、索道过江，这里的每一层都可能是"一楼"。',
      spots: [
        { id: 'cq-hongya', name: '洪崖洞', short: '现实版千与千寻', mapX: 260, mapY: 150,
          intro: '11层吊脚楼依山而建，入夜灯火亮起宛如童话油屋。',
          tips: '最佳机位在千厮门大桥和对面江滩；节假日限流，错峰前往。',
          transport: '地铁1/6号线小什字站步行10分钟。',
          extra: '从11楼出去是马路、1楼出去还是马路，亲自体验8D魔幻。' },
        { id: 'cq-liziba', name: '李子坝轻轨站', short: '轻轨穿楼名场面', mapX: 150, mapY: 110,
          intro: '2号线列车从居民楼腹中穿过，楼下观景平台天天爆满。',
          tips: '列车约3分钟一班，蹲"穿楼"机位要有耐心。',
          transport: '地铁2号线李子坝站，下楼即到观景台。',
          extra: '拍完可以去旁边的三层马路，山城步道很有味道。' },
        { id: 'cq-ciqikou', name: '磁器口古镇', short: '一条石板路，千年磁器口', mapX: 100, mapY: 210,
          intro: '嘉陵江畔的千年古镇，陈麻花和鸡杂是招牌。',
          tips: '主街人多，往深处小巷走更有古镇原味。',
          transport: '地铁1号线磁器口站直达。',
          extra: '找家临江茶馆，看江发呆一下午也很重庆。' },
        { id: 'cq-nanshan', name: '南山一棵树观景台', short: '山城夜景天花板', mapX: 300, mapY: 250,
          intro: '两江环抱、万家灯火，重庆夜景在这里一览无余。',
          tips: '日落前上山占位；山顶风大，带件外套。',
          transport: '建议打车或乘346路公交上山。',
          extra: '下山顺路吃顿南山泉水鸡，麻辣鲜香。' }
      ]
    },
    {
      id: 'xiamen', name: '厦门', slogan: '海风温柔，文艺入骨',
      color: '#5ba8c9', tags: ['需要治愈', '南方暖阳', '大海边', '文艺小清新', '拍照打卡', '发呆放空'],
      mapX: 582, mapY: 522,
      desc: '骑楼、海岛、凤凰花，连空气里都飘着咖啡香。',
      spots: [
        { id: 'xm-gulang', name: '鼓浪屿', short: '万国建筑与琴声之岛', mapX: 120, mapY: 220,
          intro: '无车小岛遍布百年别墅，转角就有钢琴声飘出。',
          tips: '船票提前在"屿见厦门"预约；穿平底鞋，全岛靠步行。',
          transport: '邮轮中心厦鼓码头乘船约20分钟。',
          extra: '最美转角在鼓新路，早上去人少好拍。' },
        { id: 'xm-shapowei', name: '沙坡尾', short: '老渔港的文艺新生', mapX: 190, mapY: 160,
          intro: '老厦门的避风坞，如今是文创店与咖啡馆的聚集地。',
          tips: '傍晚光线最好，艺术西区常有市集。',
          transport: '公交至厦大西村站步行10分钟。',
          extra: '顺路步行可达顶澳仔猫街，猫奴必去。' },
        { id: 'xm-huandao', name: '环岛路', short: '骑向大海的路', mapX: 280, mapY: 240,
          intro: '木栈道沿海蜿蜒，租辆单车吹着海风慢慢骑。',
          tips: '做好防晒；黄厝段人少景美。',
          transport: '公交至曾厝垵站，沿途多处单车租赁点。',
          extra: '曾厝垵夜市顺路逛，海蛎煎值得一试。' },
        { id: 'xm-xiada', name: '厦门大学', short: '中国最美校园之一', mapX: 240, mapY: 100,
          intro: '背山面海的百年学府，芙蓉隧道涂鸦满满都是青春。',
          tips: '需提前在"U厦大"公众号预约入校。',
          transport: '公交厦大站直达。',
          extra: '出校门就是白城沙滩，日落时分格外温柔。' }
      ]
    },
    {
      id: 'xian', name: '西安', slogan: '一眼千年，长安常安',
      color: '#c96f4a', tags: ['有点怀旧', '北方辽阔', '平原古城', '历史古迹', '地道美食', '看馆看展'],
      mapX: 463, mapY: 346,
      desc: '城墙根下吼秦腔，回民街里咥泡馍，历史在这里是日常。',
      spots: [
        { id: 'xa-bingmayong', name: '秦始皇兵马俑', short: '世界第八大奇迹', mapX: 320, mapY: 90,
          intro: '八千陶俑千人千面，两千年前的地下军团至今震撼。',
          tips: '务必请讲解或租导览器，否则只是"看土坑"；避开周末人潮。',
          transport: '地铁9号线华清池站转公交613路，或火车站乘游5路。',
          extra: '一号坑最大最震撼，留足3小时慢慢看。' },
        { id: 'xa-chengqiang', name: '西安城墙', short: '骑行在600年的城垣上', mapX: 220, mapY: 160,
          intro: '中国现存最完整的古代城垣，绕城一圈13.7公里。',
          tips: '推荐永宁门登城，傍晚骑车看日落绝美。',
          transport: '地铁2号线永宁门站直达。',
          extra: '城墙上可租自行车，全程骑行约1.5-2小时。' },
        { id: 'xa-huimin', name: '回民街', short: '碳水爱好者的天堂', mapX: 180, mapY: 220,
          intro: '鼓楼后的美食街区，羊肉泡馍、肉夹馍、镜糕一路吃到底。',
          tips: '主街逛氛围，真正本地味道藏在大皮院、洒金桥。',
          transport: '地铁2号线钟楼站步行5分钟。',
          extra: '泡馍要自己掰才地道，馍丁越小越入味。' },
        { id: 'xa-datang', name: '大唐不夜城', short: '穿越回盛唐的夜', mapX: 260, mapY: 250,
          intro: '以盛唐文化为主题的步行街，灯火璀璨如长安夜。',
          tips: '晚上去！不倒翁小姐姐等演出注意场次时间。',
          transport: '地铁3/4号线大雁塔站步行可达。',
          extra: '大雁塔北广场音乐喷泉号称亚洲最大，值得一看。' }
      ]
    },
    {
      id: 'dali', name: '大理', slogan: '风花雪月，不如见你',
      color: '#7fb685', tags: ['想慢下来', '需要治愈', '南方暖阳', '湖泊河流', '民族风情', '发呆放空', '拍照打卡'],
      mapX: 351, mapY: 502,
      desc: '苍山洱海之间，时间被调成了0.5倍速。',
      spots: [
        { id: 'dl-erhai', name: '洱海生态廊道', short: '骑行在蓝色绸带上', mapX: 140, mapY: 140,
          intro: '沿湖而建的生态廊道，S湾、廊桥都是出片圣地。',
          tips: '推荐才村至喜洲段；早上顺光，湖面最蓝。',
          transport: '古城打车至才村码头，租自行车或电瓶车骑行。',
          extra: '网红S湾人多，往前骑一点有更清净的同款弯道。' },
        { id: 'dl-gucheng', name: '大理古城', short: '五华楼下的慢时光', mapX: 220, mapY: 200,
          intro: '棋盘式古城，人民路的烤乳扇和手作小店值得闲逛。',
          tips: '白天逛人民路，晚上洋人街听民谣。',
          transport: '大理站乘8路公交或三塔专线直达。',
          extra: '床单厂艺术区周末有市集，本地手作人聚集。' },
        { id: 'dl-xizhou', name: '喜洲古镇', short: '白族民居与稻田咖啡', mapX: 300, mapY: 100,
          intro: '保存完好的白族古镇，转角楼和金黄稻田是标志。',
          tips: '稻田春秋两季最美；喜洲粑粑甜咸都要试。',
          transport: '古城乘中巴约40分钟，或骑行廊道可达。',
          extra: '稻田边的咖啡馆躺平一下午，才是喜洲正确打开方式。' },
        { id: 'dl-shuanglang', name: '双廊古镇', short: '苍洱风光第一镇', mapX: 310, mapY: 230,
          intro: '洱海东北岸的古镇，亲水民宿和日落都很有名。',
          tips: '镇内巷子窄，行李多的话提前联系客栈接送。',
          transport: '下关客运北站乘班车约1小时。',
          extra: '玉几岛看日落视野极佳，记得提前占位。' }
      ]
    },
    {
      id: 'beijing', name: '北京', slogan: '红墙黄瓦，胡同烟火',
      color: '#c94f4f', tags: ['有点怀旧', '北方辽阔', '平原古城', '历史古迹', '现代都市', '看馆看展'],
      mapX: 560, mapY: 245,
      desc: '六百年皇城根，一碗炸酱面里的讲究。',
      spots: [
        { id: 'bj-gugong', name: '故宫博物院', short: '六百年紫禁城', mapX: 220, mapY: 150,
          intro: '明清两代皇宫，九千多间殿宇藏着半部中国史。',
          tips: '务必提前7天在官网预约；中轴线+东西六宫至少留一天。',
          transport: '地铁1号线天安门东站，午门进神武门出。',
          extra: '出神武门后登景山，万春亭俯瞰紫禁城全景。' },
        { id: 'bj-hutong', name: '南锣鼓巷·什刹海', short: '胡同里的老北京', mapX: 170, mapY: 110,
          intro: '从南锣穿进帽儿胡同，再溜达到后海看夕阳。',
          tips: '南锣主街商业化，往两侧支巷钻才有真胡同味。',
          transport: '地铁6/8号线南锣鼓巷站。',
          extra: '傍晚的银锭桥"银锭观山"是老燕京八景之一。' },
        { id: 'bj-yiheyuan', name: '颐和园', short: '皇家园林博物馆', mapX: 110, mapY: 190,
          intro: '昆明湖与万寿山的山水画卷，慈禧的后花园。',
          tips: '园区很大，推荐北宫门进新建宫门出的经典路线。',
          transport: '地铁4号线北宫门站。',
          extra: '秋天西堤的桂花和残荷别有韵味。' },
        { id: 'bj-798', name: '798艺术区', short: '老厂房的文艺转身', mapX: 300, mapY: 240,
          intro: '包豪斯厂房改造的艺术区，画廊、涂鸦和咖啡馆共生。',
          tips: '周一很多画廊闭馆；UCCA大展值得专程看。',
          transport: '地铁14号线望京南站转公交或骑行。',
          extra: '园区免费，随手拍都是工业风大片。' }
      ]
    },
    {
      id: 'hangzhou', name: '杭州', slogan: '一半山水一半城',
      color: '#6ba37f', tags: ['想慢下来', '南方暖阳', '湖泊河流', '文艺小清新', '发呆放空'],
      mapX: 610, mapY: 418,
      desc: '西湖的水、龙井的茶，江南的温柔都泡在里头。',
      spots: [
        { id: 'hz-xihu', name: '西湖', short: '淡妆浓抹总相宜', mapX: 180, mapY: 160,
          intro: '苏堤春晓、断桥残雪，一年四季各有颜色。',
          tips: '环湖免费；推荐清晨或傍晚沿北山街散步。',
          transport: '地铁1号线龙翔桥站步行5分钟到湖边。',
          extra: '租辆共享单车环湖骑行，杨公堤段最清幽。' },
        { id: 'hz-lingyin', name: '灵隐寺', short: '云林禅寺，香火千年', mapX: 110, mapY: 100,
          intro: '飞来峰下的千年古刹，济公活佛的道场。',
          tips: '需先购飞来峰门票再购香花券；清晨人少清净。',
          transport: '公交7路/807路灵隐站直达。',
          extra: '寺内的素面口碑很好，顺路可访永福禅寺。' },
        { id: 'hz-xixi', name: '西溪湿地', short: '城市里的绿野仙踪', mapX: 90, mapY: 230,
          intro: '摇橹船穿行芦苇荡，"一曲溪流一曲烟"。',
          tips: '秋季听芦最浪漫；摇橹船按船计费可拼船。',
          transport: '地铁3号线西溪湿地南站。',
          extra: '《非诚勿扰》取景地深潭口值得一停。' },
        { id: 'hz-hefang', name: '河坊街', short: '南宋御街的烟火气', mapX: 260, mapY: 240,
          intro: '青石板老街，定胜糕、葱包桧、张小泉剪刀都在此。',
          tips: '小吃看排队长度基本不踩雷。',
          transport: '地铁1号线定安路站步行8分钟。',
          extra: '旁边的南宋德寿宫遗址博物馆可免费预约参观。' }
      ]
    },
    {
      id: 'shanghai', name: '上海', slogan: '梧桐深处，摩登都会',
      color: '#a394c7', tags: ['想要热闹', '南方暖阳', '现代都市', '文艺小清新', '夜景夜生活', '看馆看展'],
      mapX: 626, mapY: 402,
      desc: '外滩的钟声与武康路的梧桐，旧梦与新潮只隔一条马路。',
      spots: [
        { id: 'sh-waitan', name: '外滩', short: '万国建筑博览群', mapX: 260, mapY: 140,
          intro: '一边百年万国建筑，一边陆家嘴天际线，一江之隔两个时代。',
          tips: '夜景灯光约19:00-22:00；节假日滨江人潮汹涌。',
          transport: '地铁2/10号线南京东路站步行10分钟。',
          extra: '花2元坐轮渡到陆家嘴，江上视角看两岸更震撼。' },
        { id: 'sh-wukang', name: '武康路', short: '梧桐树下的文艺漫步', mapX: 150, mapY: 190,
          intro: '武康大楼是起点，一路梧桐掩映着名人故居与小店。',
          tips: '周末下午人多，建议上午前往。',
          transport: '地铁10/11号线交通大学站步行5分钟。',
          extra: '沿线安福路的话剧艺术中心周边小店很好逛。' },
        { id: 'sh-yuyuan', name: '豫园·城隍庙', short: '闹市中的江南园林', mapX: 300, mapY: 230,
          intro: '四百年的明代园林，九曲桥畔灯影摇曳。',
          tips: '豫园园林需购票，外围商城免费；元宵灯会最盛。',
          transport: '地铁10/14号线豫园站直达。',
          extra: '南翔馒头店的蟹粉小笼，楼下外带比楼上堂食划算。' },
        { id: 'sh-tianzifang', name: '田子坊', short: '石库门里的迷宫市集', mapX: 200, mapY: 260,
          intro: '窄弄堂里塞满手作店、画廊和小酒馆。',
          tips: '弄堂很窄，轻装前往；雨天别有味道。',
          transport: '地铁9号线打浦桥站1号口。',
          extra: '穿行时留意头顶晾衣杆，那是真实的市井上海。' }
      ]
    },
    {
      id: 'qingdao', name: '青岛', slogan: '红瓦绿树，碧海蓝天',
      color: '#4f8fc9', tags: ['想要热闹', '北方辽阔', '大海边', '地道美食', '拍照打卡', '夜景夜生活'],
      mapX: 612, mapY: 314,
      desc: '啤酒配蛤蜊，八大关的落叶铺满整个秋天。',
      spots: [
        { id: 'qd-zhanqiao', name: '栈桥', short: '百年城市的起点', mapX: 160, mapY: 190,
          intro: '伸入海中的百年长桥，回澜阁是青岛的标志。',
          tips: '冬季有海鸥成群，可备面包投喂。',
          transport: '地铁3号线青岛站步行5分钟。',
          extra: '清晨的栈桥属于本地人，最能感受城市气息。' },
        { id: 'qd-badaguan', name: '八大关', short: '万国建筑与林荫道', mapX: 230, mapY: 120,
          intro: '十条以关隘命名的马路，每季都有不同的花与叶。',
          tips: '秋季银杏大道最出片；公主楼可购票参观。',
          transport: '地铁3号线太平角公园站。',
          extra: '走到尽头就是第二海水浴场，礁石区拍照很出片。' },
        { id: 'qd-pijiu', name: '青岛啤酒博物馆', short: '会冒泡的博物馆', mapX: 290, mapY: 180,
          intro: '百年老厂房里的啤酒之旅，门票含原浆品鉴。',
          tips: '原浆和纯生各一杯，配啤酒豆更香。',
          transport: '地铁2号线利津路站步行10分钟。',
          extra: '出门就是登州路啤酒街，海鲜大排档安排上。' },
        { id: 'qd-xiaomai', name: '小麦岛公园', short: '落日与海的圆舞曲', mapX: 310, mapY: 250,
          intro: '环形小岛公园，草坪、礁石和360度的海。',
          tips: '日落前1小时上岛，环岛步道走一圈正好。',
          transport: '地铁2号线麦岛站步行15分钟。',
          extra: '岛上草坪适合野餐，记得带走垃圾。' }
      ]
    },
    {
      id: 'changsha', name: '长沙', slogan: '越夜越快乐的星城',
      color: '#e0914f', tags: ['想要热闹', '南方暖阳', '平原古城', '地道美食', '逛吃逛吃', '夜景夜生活'],
      mapX: 516, mapY: 456,
      desc: '凌晨两点的解放西，比白天更有活力。',
      spots: [
        { id: 'cs-juzi', name: '橘子洲', short: '湘江中的绿色长岛', mapX: 140, mapY: 150,
          intro: '青年毛泽东雕像临江而立，指点江山处。',
          tips: '岛很长，建议乘观光小火车直达雕像。',
          transport: '地铁2号线橘子洲站直达。',
          extra: '湘江边散步看对岸天际线，傍晚最惬意。' },
        { id: 'cs-yuelu', name: '岳麓山·爱晚亭', short: '停车坐爱枫林晚', mapX: 100, mapY: 220,
          intro: '千年学府岳麓书院在山脚，爱晚亭藏于枫林。',
          tips: '深秋红叶季最美但人最多；可索道上山滑道下山。',
          transport: '地铁4号线湖南大学站。',
          extra: '下山从湖大小吃街穿过，糖油粑粑趁热吃。' },
        { id: 'cs-wenheyou', name: '超级文和友', short: '穿越回80年代老长沙', mapX: 230, mapY: 190,
          intro: '商场里的复古老街，龙虾、搪瓷杯和旧时光。',
          tips: '拍照免费，吃饭建议错峰或先取号再逛。',
          transport: '地铁1号线黄兴广场站步行8分钟。',
          extra: '每一层都有细节彩蛋，慢慢逛别急着走。' },
        { id: 'cs-taiping', name: '太平老街', short: '麻石路上的千年烟火', mapX: 280, mapY: 240,
          intro: '贾谊故居所在的老街，臭豆腐和茶颜悦色一样都不能少。',
          tips: '黑色经典臭豆腐值得一排；深夜更热闹。',
          transport: '地铁1/2号线五一广场站步行可达。',
          extra: '拐进旁边的坡子街，火宫殿的庙会小吃很集中。' }
      ]
    },
    {
      id: 'zhangjiajie', name: '张家界', slogan: '三千奇峰，云端漫步',
      color: '#6b8e5a', tags: ['渴望冒险', '南方暖阳', '高山峡谷', '徒步户外', '拍照打卡'],
      mapX: 484, mapY: 440,
      desc: '阿凡达的悬浮山原型，云雾在峰林间流浪。',
      spots: [
        { id: 'zj-tianmen', name: '天门山', short: '999级天梯通天门', mapX: 240, mapY: 120,
          intro: '玻璃栈道悬于绝壁，天门洞穿山而过。',
          tips: 'A线索道上山最省力；玻璃栈道需另购鞋套。',
          transport: '市区索道站直达山顶，索道全长7455米。',
          extra: '云雾天反而更有仙境感，别怕天气不好。' },
        { id: 'zj-yuanjiajie', name: '袁家界', short: '阿凡达哈利路亚山', mapX: 150, mapY: 160,
          intro: '石英砂岩峰林拔地而起，乾坤柱是电影原型。',
          tips: '百龙天梯上山节省体力；环保车串联各观景台。',
          transport: '武陵源标志门入，环保车+百龙天梯。',
          extra: '迷魂台观景视野最开阔，雨后云海概率高。' },
        { id: 'zj-jinbian', name: '金鞭溪', short: '峰林脚下的绿野仙踪', mapX: 180, mapY: 240,
          intro: '7.5公里溪谷步道，猕猴在林间出没。',
          tips: '全程平路好走；猴子会抢食，零食收好。',
          transport: '森林公园门票站进入即达。',
          extra: '夏季溪水清凉，可带双拖鞋踩水。' },
        { id: 'zj-huanglong', name: '黄龙洞', short: '地下喀斯特宫殿', mapX: 300, mapY: 200,
          intro: '定海神针投保一个亿的溶洞奇观。',
          tips: '洞内恒温16度，夏天带件薄外套。',
          transport: '武陵源城区乘1路公交可达。',
          extra: '游船段穿越地下暗河，记得抬头看穹顶。' }
      ]
    },
    {
      id: 'hulunbuir', name: '呼伦贝尔', slogan: '天苍苍，野茫茫',
      color: '#8fa95b', tags: ['渴望冒险', '北方辽阔', '草原旷野', '民族风情', '发呆放空', '拍照打卡'],
      mapX: 606, mapY: 77,
      desc: 'windows桌面般的草原，牛羊比人多。',
      spots: [
        { id: 'hl-morigele', name: '莫日格勒河', short: '天下第一曲水', mapX: 200, mapY: 130,
          intro: '老舍笔下的九曲十八弯，草原上的蓝色丝带。',
          tips: '制高点观景台视野最佳；草原紫外线强注意防晒。',
          transport: '海拉尔出发包车约1小时，草原深处无公共交通。',
          extra: '黄昏时分河水泛金，是全天最美时刻。' },
        { id: 'hl-erguna', name: '额尔古纳湿地', short: '亚洲第一湿地', mapX: 280, mapY: 90,
          intro: '根河蜿蜒穿过湿地，马蹄岛是标志性景观。',
          tips: '登观景台需爬一段木栈道；秋季层林尽染。',
          transport: '额尔古纳市区打车约10分钟。',
          extra: '市区的手把肉和列巴别错过，俄式风情浓郁。' },
        { id: 'hl-hulunhu', name: '呼伦湖', short: '草原尽头的海', mapX: 300, mapY: 220,
          intro: '中国第五大湖，水天一色望不到边。',
          tips: '湖边风大，帽子要系紧。',
          transport: '满洲里出发车程约40分钟。',
          extra: '湖边鱼宴新鲜实惠，狗鱼是特色。' },
        { id: 'hl-manzhouli', name: '满洲里套娃广场', short: '边境小城的童话夜', mapX: 130, mapY: 190,
          intro: '巨型套娃建筑群的俄式风情，夜景灯火辉煌。',
          tips: '套娃广场夜景免费，景区内需购票。',
          transport: '满洲里市区打车约15分钟。',
          extra: '国门景区可远眺俄罗斯小镇，记得带身份证。' }
      ]
    }
  ];

  /** 便签可选蜡笔色 */
  var NOTE_COLORS = ['#fff3b8', '#ffd6d6', '#d6ecff', '#dcf2d8', '#f0e0ff', '#ffe8cc'];

  /** 引导页文案 */
  var WELCOME_LINES = [
    '把每一次出发，',
    '都走成值得回味的故事。'
  ];

  global.AppData = {
    QUIZ_STEPS: QUIZ_STEPS,
    CITIES: CITIES,
    NOTE_COLORS: NOTE_COLORS,
    WELCOME_LINES: WELCOME_LINES,
    LLM_PROVIDERS: LLM_PROVIDERS,
    /** 根据 id 取城市 */
    getCity: function (id) {
      return CITIES.find(function (c) { return c.id === id; }) || null;
    },
    /** 根据城市 id + 打卡点 id 取打卡点 */
    getSpot: function (cityId, spotId) {
      var city = this.getCity(cityId);
      if (!city) return null;
      return city.spots.find(function (s) { return s.id === spotId; }) || null;
    }
  };
})(window);
