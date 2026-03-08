export interface SekoImageCard {
  id: string;
  title: string;
  image: string;
  prompt: string;
}

export interface SekoShotDraft {
  id: string;
  title: string;
  visual: string;
  composition: string;
  motion: string;
  voice: string;
  line: string;
}

export interface SekoActDraft {
  id: string;
  title: string;
  time: string;
  location: string;
  shots: SekoShotDraft[];
}

export interface SekoPlanData {
  projectTitle: string;
  episodeTitle: string;
  episodeCount: number;
  pointCost: number;
  summaryBullets: string[];
  highlights: Array<{ title: string; description: string }>;
  styleBullets: string[];
  subjectBullets: string[];
  subjects: SekoImageCard[];
  sceneBullets: string[];
  scenes: SekoImageCard[];
  scriptSummary: string[];
  acts: SekoActDraft[];
}

export const sekoPlanData: SekoPlanData = {
  "projectTitle": "家有萌主：小鹦鹉大战机器猫",
  "episodeTitle": "霓虹代码：神秘U盘",
  "episodeCount": 3,
  "pointCost": 38,
  "summaryBullets": [
    "内容梗概：在霓虹光影交织、酸雨连绵的赛博之城，天才黑客“影隼”在躲避无人机追捕时，意外在垃圾堆中捡到一枚刻有古老禁忌符号的金属U盘。回到秘密据点，当他将U盘接入脑机接口的瞬间，眼前的赛博世界开始像老旧电视般剧烈闪烁，原本冰冷的霓虹招牌竟幻化成一封封来自“真实世界”的求救信。随着数据深度读取，影隼惊恐地发现，整座繁华的霓虹城竟然只是一个正在被格式化的巨型模拟程序，而他手中的U盘是唯一的逃生密钥。"
  ],
  "highlights": [
    {
      "title": "亮点1：巷弄积水倒映霓虹，金属U盘像心脏般规律跳动",
      "description": "在昏暗压抑的雨夜巷弄，黑客指尖触碰U盘的刹那，U盘表面的纹路亮起幽蓝微光，并伴随沉闷的“咚咚”心跳声，通过极致的视听对比，瞬间拉满神秘感与悬疑氛围"
    },
    {
      "title": "亮点2：接入U盘瞬间，黑客双眼流出金色代码流，房间家具化为数字残影",
      "description": "当插头连接，黑客的瞳孔瞬间被密集的金色字符占满，四周破旧的沙发、显示器开始像被风吹散的像素点一样迅速解体重组，展现出极具冲击力的“现实崩塌”视觉特效"
    },
    {
      "title": "亮点3：窗外摩天大楼像积木般层层坍塌，最后缩进一枚小小的U盘里",
      "description": "随着格式化进度达到99%，远处的赛博地标建筑开始从顶端向下无声碎裂，整个世界被吸入U盘产生的黑洞漩涡中，最后画面定格在黑暗中那枚闪烁着“完成”字样的U盘，留下极大的想象空间"
    }
  ],
  "styleBullets": [
    "基础画风风格词：皮克斯",
    "视觉风格描述：整体采用皮克斯3D卡通风格，将赛博朋克的冷峻色彩与动画的精致质感深度融合。画面通过细腻的材质表现（如雨夜街道的积水倒影、金属U盘的磨砂质感）和极具表现力的角色建模，营造出独特的视觉张力。色彩上以霓虹蓝紫为底色，与U盘及代码散发的温暖金光形成强烈对比，在展现世界崩塌的危机感时，又不失皮克斯式的华丽与奇幻感。"
  ],
  "subjectBullets": [
    "影隼-常规态：天才黑客，性格冷峻孤僻，常年穿梭在赛博之城的阴影中。",
    "影隼-代码态：接入U盘后，身体被真实世界的代码入侵，呈现出数字化异象。",
    "禁忌金属U盘：刻有古老禁忌符号的神秘媒介，是连接模拟程序与真实世界的唯一钥匙。",
    "像素化建筑：受格式化影响而崩塌的赛博大楼，正解构为无数悬浮的数字方块。"
  ],
  "subjects": [
    {
      "id": "subject-1",
      "title": "影隼-常规态",
      "image": "https://seko-resource.sensetime.com/seko/algo-gen/creations/151fd657427e4680849695d633d1afa0.png?Expires=1773562805&OSSAccessKeyId=LTAI5tQ2rqYtF9cJzUjRCUD6&Signature=sj%2FqGdrDqVuXcHDXkFp1oJZZxKk%3D&response-content-disposition=attachment%3Bfilename%3D151fd657427e4680849695d633d1afa0.png",
      "prompt": "皮克斯3D卡通风格。全景，正面拍摄，青年男性，亚洲人，黑色凌乱碎发，眼神深邃。物理面部特征：鼻梁高挺，右耳戴着一枚微小的银色耳钉，下颌线清晰。服饰穿搭：深灰色连帽机能风卫衣，黑色战术背心，带有发光蓝色灯带的电子护目镜挂在脖子上。姿态：站立。"
    },
    {
      "id": "subject-2",
      "title": "影隼-代码态",
      "image": "https://seko-resource.sensetime.com/seko/algo-gen/creations/d9a5dd2e1ccf4a03ad7809b5e73589dd.png?Expires=1773562805&OSSAccessKeyId=LTAI5tQ2rqYtF9cJzUjRCUD6&Signature=2DLkhS8o%2B%2BhLHJy8WsGZWVoReAM%3D&response-content-disposition=attachment%3Bfilename%3Dd9a5dd2e1ccf4a03ad7809b5e73589dd.png",
      "prompt": "皮克斯3D卡通风格。全景，正面拍摄，青年男性，亚洲人，黑色凌乱碎发。物理面部特征：双眼瞳孔被密集的金色矩阵代码占满并散发微光，皮肤表面隐约浮现流动的金色数据流纹路。服饰穿搭：深灰色连帽机能风卫衣，黑色战术背心。姿态：站立。"
    },
    {
      "id": "subject-3",
      "title": "禁忌金属U盘",
      "image": "https://seko-resource.sensetime.com/seko/algo-gen/creations/ef62133c2390490cb433d8ed9997f533.png?Expires=1773562805&OSSAccessKeyId=LTAI5tQ2rqYtF9cJzUjRCUD6&Signature=jftoVOsFpDxwELpLRo6SnGKnE3U%3D&response-content-disposition=attachment%3Bfilename%3Def62133c2390490cb433d8ed9997f533.png",
      "prompt": "皮克斯3D卡通风格。特写，正面拍摄，金属U盘，磨砂钛合金材质，表面刻有凹陷的古老禁忌符文。细节特征：符文缝隙中透出幽蓝色的呼吸灯光效，顶端有微小的金色数据接口，质感冰冷且厚重。"
    },
    {
      "id": "subject-4",
      "title": "像素化建筑",
      "image": "https://seko-resource.sensetime.com/seko/algo-gen/creations/db22895995c348aa89463b7236775375.png?Expires=1773562805&OSSAccessKeyId=LTAI5tQ2rqYtF9cJzUjRCUD6&Signature=qISKertNl8rB0SR5GQJSLo%2B5Clw%3D&response-content-disposition=attachment%3Bfilename%3Ddb22895995c348aa89463b7236775375.png",
      "prompt": "皮克斯3D卡通风格。特写，正面拍摄，像素化建筑，摩天大楼的局部，建筑边缘正在碎裂成大量半透明的绿色和紫色像素方块，呈现出数字化解体和坍塌的状态。细节特征：方块带有发光的边缘线。"
    }
  ],
  "sceneBullets": [
    "霓虹雨夜巷弄：赛博之城中一条狭窄、压抑的巷道。地面布满积水，倒映着上方闪烁的蓝紫色霓虹灯。墙壁上交错着生锈的管道和杂乱的电线，酸雨连绵，充满了潮湿的工业质感。",
    "秘密黑客据点：影隼躲避追捕的藏身之处。空间狭小，四周堆满了老旧的电子零件和发光的服务器机架。桌面上摆放着多台闪烁着复杂代码的显示器，室内光线主要由屏幕的冷光和微弱的氛围灯组成。",
    "闪烁的赛博街区：从据点窗外望去的城市景观。原本繁华的摩天大楼和巨大的全息招牌开始出现类似老旧电视的故障闪烁，霓虹灯光在蓝紫与金色的代码流之间不稳定地切换。",
    "崩塌的模拟城市：整个模拟程序开始格式化的终极奇观。远处的地标建筑像积木般无声碎裂，化为无数发光的金色像素点和方块，向天空中的一个中心点汇聚。",
    "数据漩涡虚空：世界完全消失后的最终场景。四周是深邃的黑暗，中心是一个巨大的、旋转的数字黑洞，无数蓝色的代码流和城市残影被吸入其中，散发出神秘而危险的光芒。"
  ],
  "scenes": [
    {
      "id": "scene-1",
      "title": "霓虹雨夜巷弄",
      "image": "https://seko-resource.sensetime.com/seko/algo-gen/creations/3d3a1986572d4ec89b7c28e1eb4d51e5.png?Expires=1773562824&OSSAccessKeyId=LTAI5tQ2rqYtF9cJzUjRCUD6&Signature=X4UBF5csAsM7e%2BDSAA1YOfbq%2BPs%3D&response-content-disposition=attachment%3Bfilename%3D3d3a1986572d4ec89b7c28e1eb4d51e5.png",
      "prompt": "皮克斯3D卡通风格。深夜的赛博朋克小巷，地面布满积水，倒映着五颜六色的霓虹灯光。墙壁布满管道和电线，细雨连绵。高饱和度的蓝紫色调，光影对比强烈。无人物。"
    },
    {
      "id": "scene-2",
      "title": "秘密黑客据点",
      "image": "https://seko-resource.sensetime.com/seko/algo-gen/creations/1a046e5ac9534b938c2e242cb989afb3.png?Expires=1773562824&OSSAccessKeyId=LTAI5tQ2rqYtF9cJzUjRCUD6&Signature=FT0c5%2BhEJ3fMvCL2lKHwvUgtgLw%3D&response-content-disposition=attachment%3Bfilename%3D1a046e5ac9534b938c2e242cb989afb3.png",
      "prompt": "皮克斯3D卡通风格。凌乱的黑客工作室，桌上摆放着多台发光的显示器和复杂的电子零件。墙上挂着各种线缆。室内光线昏暗，由屏幕的冷光 and 微弱的氛围灯照明，细节丰富。无人物。"
    },
    {
      "id": "scene-3",
      "title": "闪烁的赛博街区",
      "image": "https://seko-resource.sensetime.com/seko/algo-gen/creations/2859a5f0f7a94944a8a940d16f51c1e7.png?Expires=1773562824&OSSAccessKeyId=LTAI5tQ2rqYtF9cJzUjRCUD6&Signature=Y6ArstKC%2BdEMjesWGpZZEJPOZ9U%3D&response-content-disposition=attachment%3Bfilename%3D2859a5f0f7a94944a8a940d16f51c1e7.png",
      "prompt": "皮克斯3D卡通风格。繁华的未来城市景观，密集的摩天大楼和横跨空中的轨道。巨大的全息投影和霓虹招牌正在发生数字闪烁和扭曲。冷色调背景与故障艺术风格的色块交织。无人物。"
    },
    {
      "id": "scene-4",
      "title": "崩塌的模拟城市",
      "image": "https://seko-resource.sensetime.com/seko/algo-gen/creations/a5d1e8e5b37a4238b5eb533c5c2961b1.png?Expires=1773562824&OSSAccessKeyId=LTAI5tQ2rqYtF9cJzUjRCUD6&Signature=QGfUaKB6F%2FOv4%2FDXaB7Ng%2B5L%2FSI%3D&response-content-disposition=attachment%3Bfilename%3Da5d1e8e5b37a4238b5eb533c5c2961b1.png",
      "prompt": "皮克斯3D卡通风格。正在瓦解的赛博朋克都市，远处的摩天大楼像积木一样层层断裂并化为发光的金色像素碎片。天空中出现巨大的数字裂痕，震撼的视觉透视。无人物。"
    },
    {
      "id": "scene-5",
      "title": "数据漩涡虚空",
      "image": "https://seko-resource.sensetime.com/seko/algo-gen/creations/bb8862b8c2a24424850af3ef68db453a.png?Expires=1773562824&OSSAccessKeyId=LTAI5tQ2rqYtF9cJzUjRCUD6&Signature=trlI1JZY1%2FoIZxaM0RDbUAvRw4I%3D&response-content-disposition=attachment%3Bfilename%3Dbb8862b8c2a24424850af3ef68db453a.png",
      "prompt": "皮克斯3D卡通风格。深邃黑暗的数字虚空，中心有一个巨大的螺旋状数据漩涡，散发着金色的微光。无数的蓝色代码流向中心汇聚，神秘而宏大的空间感。无人物。"
    }
  ],
  "scriptSummary": [
    "场景数量：4",
    "旁白音色 试听"
  ],
  "acts": [
    {
      "id": "act-1",
      "title": "第1幕",
      "time": "",
      "location": "",
      "shots": [
        {
          "id": "act-1-shot-1",
          "title": "分镜01-1",
          "visual": "霓虹雨夜巷弄，地面布满积水，倒映着上方闪烁的蓝紫色霓虹灯。一架无人机在空中巡逻，探照灯扫过巷道，寻找着什么。",
          "composition": "远景，俯视视角",
          "motion": "固定镜头",
          "voice": "旁白",
          "line": "赛博之城，无人机在冰冷雨夜巡逻。"
        },
        {
          "id": "act-1-shot-2",
          "title": "分镜01-2",
          "visual": "影隼-常规态藏身于巷弄深处一堆废弃的管道后方，身体紧贴墙壁，电子护目镜挂在脖子上，眼神警惕地观察着无人机的动向。",
          "composition": "中景，过肩视角，管道在前",
          "motion": "手持拍摄，轻微晃动",
          "voice": "旁白",
          "line": "天才黑客“影隼”正躲避追捕。"
        },
        {
          "id": "act-1-shot-3",
          "title": "分镜01-3",
          "visual": "影隼-常规态快速移动，左手扒开一堆废弃的电子垃圾，意外发现一枚磨砂钛合金材质的U盘，其上刻有古老禁忌符文。",
          "composition": "近景，影隼的手与垃圾堆",
          "motion": "推镜头，聚焦U盘",
          "voice": "旁白",
          "line": "他在垃圾堆中，发现一枚U盘。"
        },
        {
          "id": "act-1-shot-4",
          "title": "分镜01-4",
          "visual": "禁忌金属U盘特写，表面的符文缝隙中透出幽蓝色的呼吸灯光效，并伴随沉闷的“咚咚”心跳声般规律闪烁。",
          "composition": "特写，禁忌金属U盘",
          "motion": "固定镜头",
          "voice": "旁白",
          "line": "古老符文，幽蓝光芒，心跳声声。"
        },
        {
          "id": "act-1-shot-5",
          "title": "分镜01-5",
          "visual": "影隼-常规态左手捏起U盘，U盘的幽蓝色微光映照在他疑惑又好奇的脸上，他抬起头，看向巷口。",
          "composition": "近景，影隼面部与U盘",
          "motion": "慢推",
          "voice": "旁白",
          "line": "这枚U盘，隐藏着未知的秘密。"
        }
      ]
    },
    {
      "id": "act-2",
      "title": "第2幕",
      "time": "",
      "location": "",
      "shots": [
        {
          "id": "act-2-shot-1",
          "title": "分镜02-1",
          "visual": "秘密黑客据点，空间狭小，四周堆满了老旧的电子零件和发光的服务器机架。影隼-常规态坐在一张破旧的椅子上，面前是多台闪烁着代码的显示器。",
          "composition": "全景，影隼与据点",
          "motion": "固定镜头",
          "voice": "旁白",
          "line": "回到据点，影隼准备探寻U盘。"
        },
        {
          "id": "act-2-shot-2",
          "title": "分镜02-2",
          "visual": "影隼-常规态右手拿起禁忌金属U盘，U盘顶端的金色数据接口闪烁着微光，他将U盘对准桌上的脑机接口槽。",
          "composition": "近景，影隼的手与U盘",
          "motion": "推镜头",
          "voice": "旁白",
          "line": "他将U盘接入脑机接口。"
        },
        {
          "id": "act-2-shot-3",
          "title": "分镜02-3",
          "visual": "特写，禁忌金属U盘被插入脑机接口的瞬间，金色接口处爆发出耀眼光芒，U盘上的符文也随之被金光完全覆盖。",
          "composition": "特写，U盘与接口",
          "motion": "快推",
          "voice": "旁白",
          "line": "接口连接，异象骤生。"
        },
        {
          "id": "act-2-shot-4",
          "title": "分镜02-4",
          "visual": "影隼-代码态的脸部特写，他的双眼瞳孔瞬间被密集的金色矩阵代码占满并散发微光，金色代码流从眼角溢出，顺着脸颊流淌。",
          "composition": "极特写，影隼的眼睛",
          "motion": "慢推",
          "voice": "旁白",
          "line": "他的双眼，被金色代码占据。"
        },
        {
          "id": "act-2-shot-5",
          "title": "分镜02-5",
          "visual": "房间内，一张破旧的沙发像被风吹散的像素点一样迅速解体，化为无数蓝色和绿色的数字方块，然后重组为一堆闪烁着代码的芯片。",
          "composition": "中景，沙发解体",
          "motion": "固定镜头",
          "voice": "旁白",
          "line": "周遭一切，开始像素化解体。"
        },
        {
          "id": "act-2-shot-6",
          "title": "分镜02-6",
          "visual": "影隼-代码态坐在椅子上，双手扶着桌面，身体微微前倾，眼神中充满了震惊与恐惧，看着房间内的变化。",
          "composition": "近景，影隼上半身",
          "motion": "拉镜头",
          "voice": "旁白",
          "line": "影隼目睹着现实崩塌。"
        }
      ]
    },
    {
      "id": "act-3",
      "title": "第3幕",
      "time": "",
      "location": "",
      "shots": [
        {
          "id": "act-3-shot-1",
          "title": "分镜03-1",
          "visual": "从据点窗外望去，原本繁华的摩天大楼和巨大的全息招牌开始出现类似老旧电视的故障闪烁。霓虹灯光在蓝紫与金色的代码流之间不稳定地切换。",
          "composition": "全景，窗外赛博街区",
          "motion": "固定镜头",
          "voice": "旁白",
          "line": "窗外世界，开始剧烈闪烁。"
        },
        {
          "id": "act-3-shot-2",
          "title": "分镜03-2",
          "visual": "特写，一栋摩天大楼的霓虹招牌，原本的广告字样扭曲，幻化成一行行金色代码，最终凝结成“HELP ME”的求救信息。",
          "composition": "特写，霓虹招牌",
          "motion": "推镜头",
          "voice": "旁白",
          "line": "霓虹招牌，变为求救信号。"
        },
        {
          "id": "act-3-shot-3",
          "title": "分镜03-3",
          "visual": "影隼-代码态站在窗前，皮肤表面隐约浮现流动的金色数据流纹路，他抬起右手，试图触碰窗外闪烁的景象，脸上写满了难以置信。",
          "composition": "中景，影隼与窗外",
          "motion": "拉镜头",
          "voice": "旁白",
          "line": "他意识到，这不是真实的世界。"
        },
        {
          "id": "act-3-shot-4",
          "title": "分镜03-4",
          "visual": "空中弹出一个巨大的半透明数据屏幕，显示着“模拟程序格式化进度：90%”，进度条正迅速向100%推进。",
          "composition": "特写，数据屏幕",
          "motion": "固定镜头",
          "voice": "旁白",
          "line": "城市，正被格式化。"
        }
      ]
    },
    {
      "id": "act-4",
      "title": "第4幕",
      "time": "",
      "location": "",
      "shots": [
        {
          "id": "act-4-shot-1",
          "title": "分镜04-1",
          "visual": "崩塌的模拟城市，远处的赛博地标建筑像积木般无声碎裂，化为无数发光的金色像素点和方块，向天空中的一个中心点汇聚。",
          "composition": "大远景，城市崩塌",
          "motion": "拉镜头，缓慢摇摄",
          "voice": "旁白",
          "line": "整座城市，正在走向终结。"
        },
        {
          "id": "act-4-shot-2",
          "title": "分镜04-2",
          "visual": "影隼-代码态站在据点废墟边缘，他全身都已被金色代码覆盖，他紧握着禁忌金属U盘，U盘发出刺眼的金光。",
          "composition": "全景，影隼与废墟",
          "motion": "固定镜头",
          "voice": "旁白",
          "line": "U盘，是唯一的逃生密钥。"
        },
        {
          "id": "act-4-shot-3",
          "title": "分镜04-3",
          "visual": "数据漩涡虚空，世界完全消失后的最终场景。四周是深邃的黑暗，中心是一个巨大的、旋转的数字黑洞，无数蓝色的代码流和城市残影被吸入其中。",
          "composition": "远景，数据漩涡",
          "motion": "推镜头",
          "voice": "旁白",
          "line": "一切归于数字虚空。"
        },
        {
          "id": "act-4-shot-4",
          "title": "分镜04-4",
          "visual": "特写，禁忌金属U盘悬浮在黑暗中，表面金光大盛，符文闪烁，屏幕上跳出“FORMAT COMPLETE”字样，然后归于平静。",
          "composition": "特写，禁忌金属U盘",
          "motion": "固定镜头",
          "voice": "旁白",
          "line": "格式化完成，新的现实开启。"
        }
      ]
    }
  ]
} as SekoPlanData;
