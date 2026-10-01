/* Shared reference shelf. Project records remain managed through the active worksite. */
const SITE_SIGN_TEMPLATES = [
  {id:'no-entry',title:'関係者以外立入禁止',caption:'立入制限・現場入口',symbol:'!',tone:'red',note:'関係者以外の立入りを禁止します'},
  {id:'no-smoking',title:'禁煙',caption:'喫煙禁止区域',symbol:'×',tone:'red',note:'喫煙は指定された場所でお願いします'},
  {id:'no-photo',title:'撮影禁止',caption:'写真撮影を禁止する区域',symbol:'×',tone:'red',note:'許可のない写真・動画撮影を禁止します'},
  {id:'safe-route',title:'安全通路',caption:'通路・歩行経路',symbol:'✓',tone:'green',note:'通路に資材・工具を置かないでください'},
  {id:'helmet',title:'保護帽着用',caption:'現場入口・作業区域',symbol:'!',tone:'blue',note:'あごひもを確実に締めてください'},
  {id:'overhead',title:'頭上注意',caption:'頭上に障害物がある場所',symbol:'!',tone:'yellow',note:'頭上を確認して通行してください'}
];
let siteSignRows=[],siteSignsLoaded=false,siteSignsError='',siteSignBusy=false;
let signDatabase;
function openSignDatabase(){if(!signDatabase)signDatabase=new Promise((resolve,reject)=>{const request=indexedDB.open('sekokan-site-resources',1);request.onupgradeneeded=()=>request.result.createObjectStore('signs',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});return signDatabase;}
async function signStore(mode,entry){const db=await openSignDatabase();return new Promise((resolve,reject)=>{const tx=db.transaction('signs',mode==='read'?'readonly':'readwrite'),store=tx.objectStore('signs');let result;const request=mode==='read'?store.getAll():mode==='delete'?store.delete(entry):store.put(entry);request.onsuccess=()=>result=request.result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('保存できませんでした'));});}
const SITE_POSTING_GROUPS = [
  {
    "id": "legal",
    "title": "1　法令上、掲示・表示が必要なもの",
    "label": "条件に該当すると必要",
    "items": [
      {
        "title": "建設業の許可票",
        "condition": "建設業許可を受けた業者が、発注者から直接請け負う工事。",
        "why": "許可業者と施工責任の所在を公衆に明らかにするため。",
        "content": "許可番号・業種、商号、代表者、主任／監理技術者等の法定事項。現場用は縦25cm以上・横35cm以上。",
        "basis": "建設業法第40条／建設業法施行規則第25条・様式第29号",
        "url": "https://www.ktr.mlit.go.jp/ktr_content/content/000699485.pdf",
        "place": "公衆から見やすい現場入口等。工事期間中。",
        "note": "現場の法定掲示は元請が対象。下請の許可票まで一律に義務と扱わない。"
      },
      {
        "title": "労災保険関係成立票",
        "condition": "労災保険の保険関係が成立している建設の事業。",
        "why": "労災保険の適用と手続先を現場で確認できるようにするため。",
        "content": "労働保険番号、保険関係成立年月日、事業主等。現行の所定様式で作成。",
        "basis": "労働保険の保険料の徴収等に関する法律施行規則第77条",
        "url": "https://www.mhlw.go.jp/web/t_doc?dataId=75124000",
        "place": "現場の見やすい場所。事業の実施中。",
        "note": "成立届の提出と成立票の掲示は別の手続き。"
      },
      {
        "title": "施工体系図",
        "condition": "民間工事は元請の特定建設業者の下請総額5,000万円以上（建築一式8,000万円以上）。公共工事は下請契約を締結するとき、金額を問わず対象。",
        "why": "請負関係と各業者の施工分担を確認できるようにするため。",
        "content": "元請・下請の商号、工事内容、技術者等を示す体系図。",
        "basis": "建設業法第24条の8第4項／公共工事の入札及び契約の適正化の促進に関する法律第15条",
        "url": "https://www.ktr.mlit.go.jp/ktr_content/content/000699485.pdf",
        "place": "民間：工事関係者の見やすい場所。公共：工事関係者と公衆の見やすい場所。",
        "note": "施工体制台帳の保管・提出と、施工体系図の掲示を区別する。業者や施工分担の変更時に更新。"
      },
      {
        "title": "再下請負通知書の提出を求める掲示",
        "condition": "施工体制台帳を作成する対象工事の作成建設業者。",
        "why": "再下請の情報を集め、施工体制台帳に反映するため。",
        "content": "再下請を行ったとき・内容変更時に通知書を提出する旨と提出先等。",
        "basis": "建設業法施行規則第14条の3第3項",
        "url": "https://www.mlit.go.jp/totikensangyo/const/content/001581333.pdf",
        "place": "工事現場の見やすい場所。台帳作成の対象期間中。",
        "note": "下請負人への通知と、現場に掲げる書面は別に確認。"
      },
      {
        "title": "建築基準法による確認表示板",
        "condition": "建築確認を受けた建築工事等。工作物への準用も確認。",
        "why": "確認を受けた工事であることと関係者を示すため。",
        "content": "建築主・設計者・工事施工者・現場管理者、確認番号等。所定様式を使用。",
        "basis": "建築基準法第89条第1項／建築基準法施行規則第11条",
        "url": "https://www.city.yokohama.lg.jp/business/bunyabetsu/kenchiku/takuchi/kousaku/default201903.files/sekou_kousakubutsu.pdf",
        "place": "工事現場の見やすい場所。確認後から工事中。",
        "note": "自治体の細則や様式も確認。確認が不要な工事に一律適用しない。"
      },
      {
        "title": "解体工事業者登録票",
        "condition": "建設リサイクル法に基づく登録業者が解体工事を行う場合。",
        "why": "登録業者と技術管理者を公衆に明らかにするため。",
        "content": "商号、登録番号、登録年月日、技術管理者等。",
        "basis": "建設工事に係る資材の再資源化等に関する法律第33条／解体工事業に係る登録等に関する省令第8条",
        "url": "https://www.pref.aichi.jp/site/kensetsugyo-fudosangyo/hyoshiki.html",
        "place": "解体現場ごとに公衆の見やすい場所。",
        "note": "土木・建築・解体の建設業許可で登録の対象外となる業者には、登録票を一律に求めない。"
      },
      {
        "title": "石綿の事前調査結果",
        "condition": "大気汚染防止法・石綿則の事前調査対象となる解体・改造・補修等の工事。",
        "why": "石綿の有無や調査結果を公衆・作業者に伝えるため。",
        "content": "調査結果、調査方法、元請等の名称、調査終了日等の法定事項。大防法の掲示はA3以上。",
        "basis": "大気汚染防止法第18条の15第5項・施行規則第16条の10／石綿障害予防規則第3条",
        "url": "https://www.env.go.jp/content/000066248.pdf",
        "place": "公衆の見やすい場所。石綿則の労働者向け掲示も確認。",
        "note": "石綿が無い結果でも掲示が必要。行政への結果報告にある面積・金額基準と混同しない。"
      },
      {
        "title": "石綿除去等の作業内容・立入禁止",
        "condition": "石綿含有建材の除去等、各法令の作業基準が適用されるとき。",
        "why": "飛散・ばく露対策と作業区域を示すため。",
        "content": "作業期間・方法・責任者等の掲示、関係者以外の立入禁止表示。対象作業に対応する法定内容。",
        "basis": "大気汚染防止法第18条の14・施行規則第16条の4／石綿障害予防規則第7条・第15条",
        "url": "https://www.env.go.jp/air/asbestos/202402zenbun.pdf",
        "place": "公衆向けの掲示と、作業区域入口の表示。対象作業の実施中。",
        "note": "事前調査結果の掲示とは別。隔離・湿潤化・保護具等の実施も必要。"
      },
      {
        "title": "産業廃棄物の保管場所表示",
        "condition": "現場に産業廃棄物を搬出まで保管する場所を設ける場合。",
        "why": "廃棄物の種類・管理者を明らかにし、適正に保管するため。",
        "content": "保管場所である旨、廃棄物の種類、管理者名・連絡先、必要に応じ積上げ高さ等。縦・横それぞれ60cm以上。",
        "basis": "廃棄物処理法第12条第2項／同法施行規則第8条",
        "url": "https://www.env.go.jp/hourei/11/000101.html",
        "place": "保管場所の見やすい箇所。保管中。",
        "note": "特別管理産業廃棄物は同法第12条の2第2項・規則第8条の13の基準も確認。"
      },
      {
        "title": "安全通路・避難用通路等の表示",
        "condition": "作業場の主要な安全通路、避難用の出入口・通路・器具。",
        "why": "経路を見分け、通路を有効に保持するため。",
        "content": "主要な通路であること、避難経路・出入口等であることを示す表示。",
        "basis": "労働安全衛生規則第540条第2項・第549条",
        "url": "https://laws.e-gov.go.jp/law/347M50002000032",
        "place": "各通路・出入口・器具の見やすい箇所。使用中。",
        "note": "安全通路は単なる推奨掲示として扱わない。看板を付けるだけでなく通路の確保が必要。"
      },
      {
        "title": "酸素欠乏危険場所の立入禁止",
        "condition": "酸素欠乏危険場所又は隣接場所で作業するとき。",
        "why": "当該作業に従事しない人の誤進入を防ぐため。",
        "content": "危険場所への立入禁止である旨。",
        "basis": "酸素欠乏症等防止規則第9条",
        "url": "https://jsite.mhlw.go.jp/nagano-roudoukyoku/content/contents/002453805.pdf",
        "place": "危険場所・入口の見やすい箇所。該当作業時。",
        "note": "掲示だけで入場管理・酸素濃度等の測定・換気を済ませない。"
      },
      {
        "title": "火気使用禁止・危険有害場所の立入禁止",
        "condition": "可燃物等による火災・爆発のおそれのある場所、法令で定める危険有害場所。",
        "why": "着火や不要な立入りによる災害を防ぐため。",
        "content": "火気を禁止する旨、関係者以外の立入禁止等。対象条項に応じて表示。",
        "basis": "労働安全衛生規則第288条・第585条",
        "url": "https://laws.e-gov.go.jp/law/347M50002000032",
        "place": "対象区域の入口等。危険が存在する期間。",
        "note": "一般の禁煙・立入禁止看板と、条件付きの法定表示を区別する。"
      },
      {
        "title": "有機溶剤の有害性・取扱注意・区分表示",
        "condition": "有機溶剤中毒予防規則の対象業務を行う場合。",
        "why": "溶剤の危険と必要な保護・対応を作業者に伝えるため。",
        "content": "健康影響、注意点、中毒時の対応、保護具等の法定内容と第一種・第二種・第三種の区分表示。",
        "basis": "有機溶剤中毒予防規則第24条・第25条",
        "url": "https://jsite.mhlw.go.jp/tokushima-roudoukyoku/newpage_01670.html",
        "place": "対象作業場の見やすい場所。対象業務中。",
        "note": "塗装・防水・防食の材料はSDSの成分と含有率等から適用を確認。"
      },
      {
        "title": "特定化学物質・石綿・粉じん等の有害性掲示",
        "condition": "各特別規則の掲示対象に該当する作業場・業務。",
        "why": "健康障害と防護方法を作業者に知らせるため。",
        "content": "物質名、健康影響、取扱注意、保護具等、該当する規則に定める事項。",
        "basis": "特定化学物質障害予防規則第38条の3／石綿障害予防規則第34条／粉じん障害防止規則第23条の2 等",
        "url": "https://jsite.mhlw.go.jp/tokushima-roudoukyoku/newpage_01670.html",
        "place": "対象作業場の見やすい場所。対象業務中。",
        "note": "リスクアセスメント対象物のすべてが特化則対象ではない。鉛・四アルキル鉛等も各規則を確認。"
      },
      {
        "title": "喫煙・飲食禁止（有害物の作業場）",
        "condition": "特化則等で喫煙・飲食が禁止される対象作業場。",
        "why": "有害物の摂取や汚染を防ぐため。",
        "content": "喫煙・飲食を禁止する旨。該当規則に応じた表示。",
        "basis": "特定化学物質障害予防規則第38条の2 等",
        "url": "https://jsite.mhlw.go.jp/nagano-roudoukyoku/content/contents/002453805.pdf",
        "place": "対象作業場の見やすい箇所。",
        "note": "休憩所全体に一律適用するものではなく、対象物・作業場で判断。"
      },
      {
        "title": "屋内喫煙室の標識",
        "condition": "健康増進法の対象施設に喫煙専用室等を設置する場合。",
        "why": "喫煙区域と20歳未満の立入制限を知らせるため。",
        "content": "喫煙室の区分等に応じた法定標識。厚生労働省の標識データを利用可能。",
        "basis": "健康増進法第33条（喫煙専用室）等",
        "url": "https://jyudokitsuen.mhlw.go.jp/sign/",
        "place": "喫煙室と施設の出入口等。",
        "note": "屋外の喫煙所と屋内喫煙室は制度が異なる。禁煙表示全般を一律に法定とは扱わない。"
      }
    ]
  },
  {
    "id": "notice",
    "title": "2　法令上の周知が必要なもの",
    "label": "掲示等による周知",
    "items": [
      {
        "title": "作業主任者の氏名・職務",
        "condition": "作業主任者を選任する対象作業。",
        "why": "誰が何を指揮・管理するかを関係労働者が分かるようにするため。",
        "content": "氏名と、その人に行わせる法定職務。",
        "basis": "労働安全衛生規則第18条",
        "url": "https://anzeninfo.mhlw.go.jp/yougo/yougo34_1.html",
        "place": "作業場の見やすい箇所等。選任・交代時に更新。",
        "note": "法令は「掲示する等」による周知。看板だけが唯一の方法ではない。"
      },
      {
        "title": "化学物質管理者・保護具着用管理責任者の氏名",
        "condition": "各責任者の選任義務に該当して選任した場合。",
        "why": "化学物質や保護具の相談・管理窓口を明確にするため。",
        "content": "選任した人の氏名を関係労働者に周知。",
        "basis": "労働安全衛生規則第12条の5・第12条の6",
        "url": "https://jsite.mhlw.go.jp/fukui-roudoukyoku/content/contents/001904398.pdf",
        "place": "事業場の見やすい箇所等。選任・交代時。",
        "note": "掲示等の方法による周知が必要。一般の保護具使用だけで一律に同責任者の対象になるわけではない。"
      },
      {
        "title": "SDS・化学物質リスクアセスメント結果",
        "condition": "通知対象物の取扱い・化学物質リスクアセスメント等の対象業務。",
        "why": "材料の危険と実際の作業に必要な対策を知るため。",
        "content": "SDS情報、対象物・業務、評価結果、実施する低減措置等。",
        "basis": "労働安全衛生法第101条第2項／労働安全衛生規則第34条の2の8・第98条の2",
        "url": "https://www.mhlw.go.jp/file/06-Seisakujouhou-11300000-Roudoukijunkyokuanzeneiseibu/0000099625.pdf",
        "place": "関係労働者が常時確認できる状態。採用・使用開始前と変更時。",
        "note": "掲示のほか備付け・交付・電子的方法等の適法な周知も可能。有害性の法定掲示とは別に確認。"
      },
      {
        "title": "熱中症の報告先・対応手順",
        "condition": "WBGT28℃以上又は気温31℃以上で、連続1時間以上又は1日4時間を超えることが見込まれる作業。",
        "why": "異変を早く報告し、重篤化する前に対応するため。",
        "content": "報告する相手・連絡先、作業離脱・冷却・受診等の実施手順。",
        "basis": "労働安全衛生規則第612条の2",
        "url": "https://www.mhlw.go.jp/content/001490909.pdf",
        "place": "対象作業の開始前に周知。現場ごとの連絡先を更新。",
        "note": "体制整備・手順作成・周知が義務。専用の看板だけが義務なのではない。掲示は現場ですぐ見返す方法として有効。"
      }
    ]
  },
  {
    "id": "contract",
    "title": "3　契約・仕様書・条例等で確認するもの",
    "label": "個別条件を確認",
    "items": [
      {
        "title": "建退共の現場標識",
        "condition": "建退共の適用事業主。公共工事では契約・特記仕様書等も確認。",
        "why": "労働者に制度の適用を知らせ、掛金納付の意識を高めるため。",
        "content": "建退共の制度適用事業主であることを示す標識。",
        "basis": "建退共の制度運用・発注者の契約条件",
        "url": "https://www.kentaikyo.taisyokukin.go.jp/keiyakusya/koukyoukouji/",
        "place": "現場の見やすい場所。制度適用と契約条件に合わせて。",
        "note": "中小企業退職金共済法に基づく制度だが、全国すべての現場の看板を同法による一律掲示義務としない。"
      },
      {
        "title": "工事案内・道路規制・自治体指定の標識",
        "condition": "公共工事、道路上の工事、中高層建築等で仕様書・許可条件・自治体条例の対象となる場合。",
        "why": "工事内容や交通規制を近隣・通行人に知らせるため。",
        "content": "工事名、期間、連絡先、規制・迂回案内、条例で指定する計画事項等。",
        "basis": "発注者の仕様書／道路占用・使用許可条件／現場所在地の条例等",
        "url": null,
        "place": "指定された位置・時期・寸法に従う。",
        "note": "個別条件によって義務になる。道路工事や自治体条例を全国一律の推奨表示として扱わず、発注者・道路管理者・自治体の指示を確認。"
      }
    ]
  },
  {
    "id": "recommended",
    "title": "4　法的には専用掲示が必須ではないが、あるとよいもの",
    "label": "推奨",
    "items": [
      {
        "title": "緊急連絡先・救急搬送経路・AED案内",
        "condition": "全国一律の専用掲示義務が通常はないもの。現場条件で別の義務がないか確認。",
        "why": "事故時の連絡と救護を早めるため。",
        "content": "119、現場責任者、病院への経路、AEDの位置等。個人情報の公開範囲も確認。",
        "basis": "現場での推奨事項",
        "url": null,
        "place": "入口・朝礼場所・休憩所・該当場所など、用途に合わせて。",
        "note": "熱中症の報告体制など個別の法定周知や契約で必要となる部分は、推奨とは別に実施。"
      },
      {
        "title": "現場組織図・担当者一覧",
        "condition": "全国一律の専用掲示義務が通常はないもの。現場条件で別の義務がないか確認。",
        "why": "誰に相談・報告すればよいかを明確にするため。",
        "content": "役割、担当者、所属、連絡方法。",
        "basis": "現場での推奨事項",
        "url": null,
        "place": "入口・朝礼場所・休憩所・該当場所など、用途に合わせて。",
        "note": "施工体系図や作業主任者等の法定周知を、これだけで代用しない。"
      },
      {
        "title": "保護帽・墜落制止用器具の着用案内",
        "condition": "全国一律の専用掲示義務が通常はないもの。現場条件で別の義務がないか確認。",
        "why": "入場時の着用忘れや誤った使い方を減らすため。",
        "content": "着用が必要な場所と現場ルール、正しい使用方法。",
        "basis": "現場での推奨事項",
        "url": null,
        "place": "入口・朝礼場所・休憩所・該当場所など、用途に合わせて。",
        "note": "専用看板は一般に推奨。対象作業での保護具使用義務は別にあり、看板が任意でも着用が任意になるわけではない。"
      },
      {
        "title": "頭上注意・足元注意・段差注意",
        "condition": "全国一律の専用掲示義務が通常はないもの。現場条件で別の義務がないか確認。",
        "why": "見落としやすい障害物や段差に気付いてもらうため。",
        "content": "危険の位置・内容と通行上の注意。",
        "basis": "現場での推奨事項",
        "url": null,
        "place": "入口・朝礼場所・休憩所・該当場所など、用途に合わせて。",
        "note": "まず障害・段差の解消や防護を行う。必要な立入禁止等の法定措置は別に実施。"
      },
      {
        "title": "撮影禁止・SNS投稿禁止",
        "condition": "全国一律の専用掲示義務が通常はないもの。現場条件で別の義務がないか確認。",
        "why": "図面・設備・工事写真等の機密情報流出を防ぐため。",
        "content": "許可の窓口、禁止の範囲、写真の取扱い。",
        "basis": "現場での推奨事項",
        "url": null,
        "place": "入口・朝礼場所・休憩所・該当場所など、用途に合わせて。",
        "note": "一般に専用看板の全国一律義務はない。発注者との機密保持や現場ルールを反映。"
      },
      {
        "title": "整理整頓・資材置場・工具返却先",
        "condition": "全国一律の専用掲示義務が通常はないもの。現場条件で別の義務がないか確認。",
        "why": "通路への放置や資材の混在を減らすため。",
        "content": "置場名称、品目、返却先、責任者。",
        "basis": "現場での推奨事項",
        "url": null,
        "place": "入口・朝礼場所・休憩所・該当場所など、用途に合わせて。",
        "note": "産業廃棄物保管場所の法定表示、安全通路の表示は別。"
      },
      {
        "title": "当日の作業・工程・重機動線",
        "condition": "全国一律の専用掲示義務が通常はないもの。現場条件で別の義務がないか確認。",
        "why": "他職種との干渉や重機への接近を減らすため。",
        "content": "当日の作業範囲、車両ルート、搬入時間、立入制限。",
        "basis": "現場での推奨事項",
        "url": null,
        "place": "入口・朝礼場所・休憩所・該当場所など、用途に合わせて。",
        "note": "作業計画の作成・周知や立入防止等が法令上必要な場合、その義務を別途満たす。"
      },
      {
        "title": "一般の禁煙・指定喫煙場所案内",
        "condition": "全国一律の専用掲示義務が通常はないもの。現場条件で別の義務がないか確認。",
        "why": "吸い殻・火災・受動喫煙のトラブルを減らすため。",
        "content": "禁煙区域と喫煙可能な場所、吸い殻の処理方法。",
        "basis": "現場での推奨事項",
        "url": null,
        "place": "入口・朝礼場所・休憩所・該当場所など、用途に合わせて。",
        "note": "火気禁止・有害物作業場・屋内喫煙室の標識等は条件により法定。条例も確認。"
      },
      {
        "title": "熱中症予防・WBGT・休憩所の案内",
        "condition": "全国一律の専用掲示義務が通常はないもの。現場条件で別の義務がないか確認。",
        "why": "水分補給や休憩を取りやすくするため。",
        "content": "現場の測定値、休憩所、水分・塩分補給、体調確認。",
        "basis": "現場での推奨事項",
        "url": null,
        "place": "入口・朝礼場所・休憩所・該当場所など、用途に合わせて。",
        "note": "法定の報告体制・対応手順の周知は別に必要。掲示だけで対応を済ませない。"
      }
    ]
  }
];
function renderSiteResources(){return intro('SITE RESOURCES','現場管理','必要掲示物の確認と印刷用の表示物')+`<section class="card resource-entry"><div><h2>表示物関係</h2><p>印刷して使える表示物と、追加したPDF・画像をまとめています。</p></div><button type="button" class="btn" data-go="siteSigns">表示物関係を開く</button></section><section class="card posting-guide"><h2>必要掲示物</h2><p>掲示物の名前を押すと、対象となる条件・必要な理由・根拠法令・掲示場所を確認できます。</p><p class="hint">確認日：2026年10月2日。全国の建設現場でよく使う主な項目を掲載しています。工種・材料・設備・規模・所在地によって追加の表示が必要です。</p><div class="posting-legend"><span>掲示・表示の義務</span><span>周知の義務</span><span>契約・条例等</span><span>推奨</span></div><p>「掲示の義務」と「掲示等による周知の義務」は異なります。推奨に分類した看板でも、条件によって別の法定表示や契約上の義務が生じます。</p><nav class="posting-index" aria-label="必要掲示物の分類">${SITE_POSTING_GROUPS.map(g=>`<a href="#posting-${g.id}">${esc(g.title)}（${g.items.length}件）</a>`).join('')}</nav></section>${SITE_POSTING_GROUPS.map(g=>`<section class="card posting-group" id="posting-${g.id}"><h2>${esc(g.title)} <small>${g.items.length}件</small></h2>${g.items.map(item=>`<details><summary><strong>${esc(item.title)}</strong><span class="posting-label posting-label-${g.id}">${esc(g.label)}</span></summary><dl><dt>対象・必要になる条件</dt><dd>${esc(item.condition)}</dd><dt>なぜ必要か・あるとよい理由</dt><dd>${esc(item.why)}</dd><dt>掲示・周知する内容</dt><dd>${esc(item.content)}</dd><dt>法的根拠・位置付け</dt><dd>${esc(item.basis)}</dd><dt>掲示場所・時期</dt><dd>${esc(item.place)}</dd>${item.note?`<dt>確認ポイント</dt><dd>${esc(item.note)}</dd>`:''}${item.url?`<dt>根拠・公式資料</dt><dd><a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer">${esc(item.basis)}の公式資料を開く</a></dd>`:''}</dl></details>`).join('')}</section>`).join('')}`;}
function signPreview(sign){return `<div class="site-sign-sheet sign-${sign.tone}"><div class="site-sign-symbol" aria-hidden="true">${sign.symbol}</div><strong>${esc(sign.title)}</strong><p>${esc(sign.note)}</p></div>`;}
function renderSiteSigns(){if(!siteSignsLoaded){siteSignsLoaded=true;signStore('read').then(rows=>{siteSignRows=rows.sort((a,b)=>b.createdAt-a.createdAt);if(page==='siteSigns')render();}).catch(()=>{siteSignsError='追加した表示物を読み込めませんでした。ページを再読み込みしてください。';if(page==='siteSigns')render();});}return intro('SITE RESOURCES','表示物関係','印刷して現場に掲示できます')+`<button type="button" class="btn secondary" data-go="projects">現場管理に戻る</button><section class="resource-section"><h2>用意されている表示物</h2><div class="resource-sign-grid">${SITE_SIGN_TEMPLATES.map(sign=>`<article class="card resource-sign-card">${signPreview(sign)}<h3>${esc(sign.title)}</h3><p>${esc(sign.caption)}</p><button type="button" class="btn" data-sign-template="${sign.id}">プレビュー・印刷</button></article>`).join('')}</div></section><section class="card resource-section"><div class="section-head"><h2>追加した表示物</h2></div><form id="siteSignUpload" class="resource-upload"><label class="field">表示物の名前<input name="title" required maxlength="100" placeholder="例：北側入口・立入禁止"></label><label class="field">PDF・画像<input name="file" type="file" required accept="application/pdf,image/jpeg,image/png,image/webp"></label><button class="btn" type="submit" ${siteSignBusy?'disabled':''}>${siteSignBusy?'保存中…':'表示物を追加'}</button></form><p class="hint">PDF・JPG・PNG・WebP（1ファイル20MBまで）。追加した表示物はこの端末のブラウザに保存され、現場を切り替えても使えます。</p><p role="status" id="siteSignsStatus">${esc(siteSignsError)}</p><div class="resource-uploaded-list">${siteSignRows.map(row=>`<article class="row"><div class="grow"><strong>${esc(row.title)}</strong><small>${esc(row.filename)} · ${new Intl.DateTimeFormat('ja-JP').format(new Date(row.createdAt))}</small></div><div class="resource-file-actions"><button class="btn secondary" type="button" data-sign-open="${esc(row.id)}">開く・印刷</button><button class="btn secondary" type="button" data-sign-download="${esc(row.id)}">ダウンロード</button><button class="btn danger" type="button" data-sign-remove-file="${esc(row.id)}">削除</button></div></article>`).join('')||'<p class="hint">追加した表示物はまだありません。</p>'}</div></section>`;}
function openSignPrint(sign){const popup=window.open('','_blank');if(!popup){alert('プレビューを開くため、ポップアップを許可してください。');return;}popup.document.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(sign.title)}</title><link rel="stylesheet" href="${new URL('assets/site-resources.css?v=2',location.href).href}"></head><body class="sign-print-page"><div class="sign-print-tools"><button type="button" id="printSign">印刷する</button><p>印刷画面でA4・A3などの用紙サイズを選択してください。</p></div>${signPreview(sign)}</body></html>`);popup.document.close();popup.document.getElementById('printSign').onclick=()=>popup.print();}
const signObjectURLs=new Set();
window.addEventListener('pagehide',()=>{for(const url of signObjectURLs)URL.revokeObjectURL(url);signObjectURLs.clear();});
function openStoredSign(row){const url=URL.createObjectURL(row.file);signObjectURLs.add(url);if(row.file.type==='application/pdf'){if(!window.open(url,'_blank'))alert('表示物を開くため、ポップアップを許可してください。');return;}const popup=window.open('','_blank');if(!popup){URL.revokeObjectURL(url);signObjectURLs.delete(url);alert('表示物を開くため、ポップアップを許可してください。');return;}popup.document.write(`<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(row.title)}</title><link rel="stylesheet" href="${new URL('assets/site-resources.css?v=2',location.href).href}"></head><body class="sign-print-page"><div class="sign-print-tools"><button type="button" id="printSign">印刷する</button></div><img class="sign-print-image" src="${url}" alt="${esc(row.title)}"></body></html>`);popup.document.close();popup.document.getElementById('printSign').onclick=()=>popup.print();}
document.addEventListener('submit',async event=>{if(event.target.id!=='siteSignUpload')return;event.preventDefault();if(siteSignBusy)return;const form=event.target,values=new FormData(form),file=values.get('file'),title=String(values.get('title')||'').trim();if(!title||!(file instanceof File)||!file.size)return;if(!['application/pdf','image/jpeg','image/png','image/webp'].includes(file.type)){document.getElementById('siteSignsStatus').textContent='PDF・JPG・PNG・WebPを選んでください。';return;}if(file.size>20*1024*1024){document.getElementById('siteSignsStatus').textContent='20MB以下のファイルを選んでください。';return;}siteSignBusy=true;form.querySelector('button').disabled=true;try{const row={id:crypto.randomUUID(),title,filename:file.name,file,createdAt:Date.now()};await signStore('write',row);siteSignRows.unshift(row);siteSignsError='表示物を追加しました。';}catch{siteSignsError='保存できませんでした。端末の空き容量やブラウザの保存設定を確認してください。';}finally{siteSignBusy=false;if(page==='siteSigns')render();}});
document.addEventListener('click',async event=>{const button=event.target.closest('[data-sign-template],[data-sign-open],[data-sign-download],[data-sign-remove-file]');if(!button)return;const template=SITE_SIGN_TEMPLATES.find(x=>x.id===button.dataset.signTemplate);if(template){openSignPrint(template);return;}const row=siteSignRows.find(x=>x.id===(button.dataset.signOpen||button.dataset.signDownload||button.dataset.signRemoveFile));if(!row)return;if(button.hasAttribute('data-sign-open')){openStoredSign(row);return;}if(button.hasAttribute('data-sign-download')){const url=URL.createObjectURL(row.file),link=document.createElement('a');link.href=url;link.download=row.filename;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);return;}if(!confirm(`「${row.title}」を削除しますか？`))return;try{await signStore('delete',row.id);siteSignRows=siteSignRows.filter(x=>x.id!==row.id);siteSignsError='表示物を削除しました。';}catch{siteSignsError='削除できませんでした。もう一度お試しください。';}if(page==='siteSigns')render();});
