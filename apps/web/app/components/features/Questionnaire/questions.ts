export type Lang = 'ja' | 'en';
export type Localized = Record<Lang, string>;

/**
 * 1人分の回答。単一選択と記述式は文字列、複数選択は配列で持つ。
 * 「その他」の自由記述は `${質問 id}Other` に入れる。
 */
export type Answers = Record<string, string | string[]>;

/** 回答値には集計を言語に依らず揃えるため日本語ラベルを使う。 */
export type QuestionOption = {
  label: Localized;
  /** other: 選ぶと自由記述欄を出す。exclusive: 他の選択肢と同時に選べない。 */
  kind?: 'other' | 'exclusive';
};

export type QuestionDef = {
  id: string;
  label: Localized;
  showIf?: (answers: Answers) => boolean;
} & (
  | { type: 'text' }
  | { type: 'single' | 'multiple'; options: QuestionOption[] }
);

const opt = (
  ja: string,
  en: string,
  kind?: QuestionOption['kind'],
): QuestionOption => ({ label: { ja, en }, kind });

const other = opt('その他', 'Other', 'other');
const agree = [opt('同意する', 'Agree')];

const selected = (answers: Answers, id: string, ...values: string[]) => {
  const answer = answers[id];
  return values.some((value) =>
    Array.isArray(answer) ? answer.includes(value) : answer === value,
  );
};

const STAGES = ['UNITEDステージ', '1Aステージ', '大学会館ステージ'];

export const QUESTIONNAIRE_QUESTIONS: QuestionDef[] = [
  {
    id: 'age',
    label: { ja: '年齢', en: 'Age' },
    type: 'single',
    options: [
      opt('10歳未満', 'Under 10'),
      opt('10代', '10s'),
      opt('20代', '20s'),
      opt('30代', '30s'),
      opt('40代', '40s'),
      opt('50代', '50s'),
      opt('60歳以上', '60 or older'),
    ],
  },
  {
    id: 'gender',
    label: { ja: '性別', en: 'Gender' },
    type: 'single',
    options: [
      opt('男性', 'Male'),
      opt('女性', 'Female'),
      opt('回答しない', 'Prefer not to say'),
    ],
  },
  {
    id: 'affiliation',
    label: { ja: '所属', en: 'Affiliation' },
    type: 'single',
    options: [
      opt('中学生', 'Junior high school student'),
      opt('高校生', 'High school student'),
      opt('本学学生(学群生)', 'University of Tsukuba Undergraduate Student'),
      opt('本学学生(大学院生)', 'University of Tsukuba Graduate Student'),
      opt('本学教職員', 'Faculty and Staff'),
      opt('本学卒業生', 'University of Tsukuba Alumni'),
      opt('本学関係者・親族', 'University-related person / Family member'),
      opt('他大学の学生', 'Student from another university'),
      other,
    ],
  },
  {
    id: 'awareness',
    label: {
      ja: '雙峰祭を何で知りましたか。',
      en: 'How did you learn about the Sohosai Festival?',
    },
    type: 'multiple',
    options: [
      opt('公式ホームページ', 'Official website'),
      opt('公式SNS', 'Official SNS'),
      opt('ポスター等の掲示物・配布物', 'Posters or Flysheets'),
      opt('家族・友人等からの紹介', 'Recommendation from family or friends'),
      other,
    ],
  },
  {
    id: 'visitCount',
    label: {
      ja: '雙峰祭へのご来場は何回目ですか。',
      en: 'How many times have you been to the Sohosai Festival?',
    },
    type: 'single',
    options: [
      opt('初めて', 'First time'),
      opt('2回目', '2nd time'),
      opt('3回以上', '3 times or more'),
    ],
  },
  {
    id: 'satisfaction',
    label: {
      ja: '雙峰祭全体に対する満足度を教えてください。',
      en: 'Please rate your overall satisfaction with the Sohosai Festival.',
    },
    type: 'single',
    options: [
      opt('満足', 'Satisfied'),
      opt('やや満足', 'Somewhat satisfied'),
      opt('どちらともいえない', 'Neither satisfied nor dissatisfied'),
      opt('やや不満', 'Somewhat dissatisfied'),
      opt('不満', 'Dissatisfied'),
    ],
  },
  {
    id: 'infoDeskComment',
    label: {
      ja: '案内所における学園祭実行委員の対応について、良かった点や改善してほしい点など、ご感想・ご意見をお聞かせください。',
      en: 'Please share your thoughts or feedback regarding the response/service of the Festival Executive Committee members at the Information Desks (e.g., what was good, areas for improvement).',
    },
    type: 'text',
  },
  {
    id: 'travelTime',
    label: {
      ja: '雙峰祭の会場までの所要時間を教えてください。',
      en: 'How long did it take you to come to the Sohosai Festival venue?',
    },
    type: 'single',
    options: [
      opt('15分未満', 'Less than 15 minutes'),
      opt('30分未満', 'Less than 30 minutes'),
      opt('1時間未満', 'Less than 1 hour'),
      opt('2時間未満', 'Less than 2 hours'),
      opt('2時間以上', '2 hours or more'),
    ],
  },
  {
    id: 'transportation',
    label: {
      ja: '会場まではどのような交通機関でお越しになりましたか。',
      en: 'What mode of transportation did you use to come to the venue?',
    },
    type: 'multiple',
    options: [
      opt('電車', 'Train'),
      opt('筑波大学循環バス', 'University of Tsukuba Loop Bus'),
      opt(
        '筑波大学循環以外のバス',
        'Buses other than University of Tsukuba Loop Bus',
      ),
      opt('自家用車・バイク', 'Private car or Motorcycle'),
      opt('自転車', 'Bicycle'),
      opt('徒歩', 'On foot'),
      other,
    ],
  },
  {
    id: 'gotLost',
    label: {
      ja: '会場内で目的地までの道に迷いましたか。',
      en: 'Did you get lost on your way to destinations within the venue?',
    },
    type: 'single',
    options: [
      opt('迷わなかった', 'Did not get lost'),
      opt('少し迷った', 'Got a little lost'),
      opt('迷った', 'Got lost'),
    ],
  },
  {
    id: 'lostPlaces',
    label: {
      ja: '会場内のどこで迷いましたか。',
      en: 'Where within the venue did you get lost?',
    },
    type: 'multiple',
    options: [
      opt('建物内の教室', 'Classrooms inside buildings'),
      opt('トイレ', 'Restrooms'),
      opt('階段', 'Stairs'),
      opt('エレベーター', 'Elevators'),
      opt('建物間の移動', 'Moving between buildings'),
      opt('エリア間の移動', 'Moving between areas'),
      opt('休憩所', 'Rest areas'),
      opt('案内所', 'Information Desks'),
      opt('バス停', 'Bus stops'),
      opt('駐車場', 'Parking lots'),
      opt('駐輪場', 'Bicycle parking lots'),
      other,
    ],
    showIf: (a) => selected(a, 'gotLost', '少し迷った', '迷った'),
  },
  {
    id: 'restArea',
    label: {
      ja: '休憩所は快適でしたか。',
      en: 'Were the rest areas comfortable?',
    },
    type: 'single',
    options: [
      opt('快適だった', 'Comfortable'),
      opt('普通だった', 'Average'),
      opt('快適でなかった', 'Not comfortable'),
      opt('利用していない', 'Did not use'),
    ],
  },
  {
    id: 'trashCans',
    label: {
      ja: 'ごみ箱の設置場所や数について、当てはまるものを教えてください。',
      en: 'Which of the following applies to the location and quantity of trash cans?',
    },
    type: 'multiple',
    options: [
      opt(
        '場所・数ともに十分だった',
        'Both location and quantity were sufficient',
      ),
      opt('分別がしやすかった', 'Easy to sort trash'),
      opt('普通', 'Average'),
      opt(
        'ごみ箱の場所が分かりにくかった・少なかった',
        'Trash cans were hard to find or insufficient',
      ),
      other,
    ],
  },
  {
    id: 'accessComment',
    label: {
      ja: '会場へのアクセスや学内環境について、良かった点や改善してほしい点など、ご感想・ご意見をお聞かせください。',
      en: 'Please share your comments or feedback regarding campus accessibility and the campus environment (e.g., what was good, areas for improvement).',
    },
    type: 'text',
  },
  {
    id: 'pamphletPrice',
    label: {
      ja: 'パンフレットの価格は適切でしたか。',
      en: 'Was the price of the official pamphlet appropriate?',
    },
    type: 'single',
    options: [
      opt('安いと思う', 'Cheap'),
      opt('適切だと思う', 'Appropriate'),
      opt('高いと思う', 'Expensive'),
    ],
  },
  {
    id: 'favoriteGoods',
    label: {
      ja: '最も良かったと思う雙峰祭公式グッズを教えてください。',
      en: 'Which official Sohosai merchandise did you like the most?',
    },
    type: 'single',
    options: [
      opt('ステッカーA', 'Sticker A'),
      opt('ステッカーB', 'Sticker B'),
      opt('缶バッジA', 'Button Badge A'),
      opt('缶バッジB', 'Button Badge B'),
      opt('クリアファイル', 'Clear File Folder'),
      opt('アクリルキーホルダー', 'Acrylic Keychain'),
      opt('そぽたんぬいぐるみキーホルダー', 'Sopotan Plush Keychain'),
      opt('トートバッグ', 'Tote Bag'),
      opt('タオルハンカチ', 'Towel Handkerchief'),
      opt('パスケース', 'Pass Case'),
      opt('そぽたんの動く耳帽子', 'Sopotan Moving Ear Hat'),
      opt('ぷくぷくシール', 'Puffy Stickers'),
    ],
  },
  {
    id: 'goodsPrice',
    label: {
      ja: 'グッズの価格は適切でしたか。',
      en: 'Were the prices of the official merchandise appropriate?',
    },
    type: 'single',
    options: [
      opt('安いと思う', 'Cheap'),
      opt('適切だと思う', 'Reasonable / Appropriate'),
      opt('高いと思う', 'Expensive'),
    ],
  },
  {
    id: 'goodsRequest',
    label: {
      ja: '今後販売してほしいグッズや、あれば買いたいと思うグッズがあれば教えてください。',
      en: 'Please let us know if there are any merchandise items you would like us to sell or would buy in the future.',
    },
    type: 'text',
  },
  {
    id: 'pamphletGoodsComment',
    label: {
      ja: 'パンフレットやグッズについて、良かった点や改善してほしい点など、ご感想・ご意見をお聞かせください。',
      en: 'Please share your comments or feedback regarding the pamphlets and merchandise (e.g., what was good, areas for improvement).',
    },
    type: 'text',
  },
  {
    id: 'cashless',
    label: {
      ja: '今後、学園祭でキャッシュレス決済が導入された場合、利用したいですか。',
      en: 'If cashless payment is introduced at the festival in the future, would you like to use it?',
    },
    type: 'single',
    options: [
      opt('利用したい', 'Would like to use'),
      opt('利用したくない', 'Would not like to use'),
      opt('どちらともいえない', 'Neither'),
    ],
  },
  {
    id: 'paymentMethods',
    label: {
      ja: 'どのような決済方法の利用を希望しますか。',
      en: 'Which payment methods would you prefer to use?',
    },
    type: 'multiple',
    options: [
      opt('クレジットカード・タッチ決済', 'Credit card or Touch pay'),
      opt(
        'QRコード決済(PayPay,d払い等)',
        'QR code payment (PayPay, d-Barai, etc.)',
      ),
      opt('電子マネー(iD,QUICPay等)', 'Electronic money (iD, QUICPay, etc.)'),
      opt(
        '交通系ICカード(Suica,PASMO等)',
        'Transportation IC card (Suica, PASMO, etc.)',
      ),
      other,
    ],
    showIf: (a) => selected(a, 'cashless', '利用したい'),
  },
  {
    id: 'stageWatched',
    label: {
      ja: '観覧されたステージ企画はありますか。',
      en: 'Did you watch any stage events?',
    },
    type: 'multiple',
    options: [
      opt('UNITEDステージ', 'UNITED Stage'),
      opt('1Aステージ', '1A Stage'),
      opt('大学会館ステージ', 'University Hall (Daigaku Kaikan) Stage'),
      opt('観覧していない', 'Did not watch', 'exclusive'),
    ],
  },
  {
    id: 'stageNotWatchedReason',
    label: {
      ja: '観覧していない(または一部観覧していない)理由として、当てはまるものを教えてください。',
      en: 'What was the reason you did not watch (or only partially watched) the stage events?',
    },
    type: 'multiple',
    options: [
      opt('興味のある企画がなかった', 'No events of interest'),
      opt('時間が合わなかった', 'Time was inconvenient'),
      opt('場所が分からなかった', 'Location was unclear'),
      opt('もともと行く予定がなかった', 'Had no plans to attend originally'),
      other,
    ],
    showIf: (a) => {
      const watched = a.stageWatched;
      return (
        Array.isArray(watched) &&
        watched.length > 0 &&
        !STAGES.every((stage) => watched.includes(stage))
      );
    },
  },
  {
    id: 'stageComment',
    label: {
      ja: 'ステージ企画について、良かった点や改善してほしい点など、ご感想・ご意見をお聞かせください。',
      en: 'Please share your thoughts or feedback regarding the stage events (e.g., what was good, areas for improvement).',
    },
    type: 'text',
  },
  {
    id: 'liveStream',
    label: {
      ja: 'ステージの生配信を視聴しましたか。',
      en: 'Did you watch the live stream of the stage events?',
    },
    type: 'single',
    options: [
      opt('視聴した', 'Watched'),
      opt('これから視聴する予定/視聴したい', 'Plan to watch / Want to watch'),
      opt(
        '視聴する予定はない/視聴しない',
        'Do not plan to watch / Will not watch',
      ),
    ],
  },
  {
    id: 'liveStreamStages',
    label: {
      ja: 'どの企画を視聴しましたか、または視聴する予定ですか。',
      en: 'Which stage live streams did you watch or plan to watch?',
    },
    type: 'multiple',
    options: [
      opt('UNITEDステージ', 'UNITED Stage'),
      opt('1Aステージ', '1A Stage'),
      opt('大学会館ステージ', 'University Hall (Daigaku Kaikan) Stage'),
      opt('視聴していない', 'Did not watch', 'exclusive'),
    ],
    showIf: (a) =>
      selected(a, 'liveStream', '視聴した', 'これから視聴する予定/視聴したい'),
  },
  {
    id: 'projectInfoSources',
    label: {
      ja: '企画に関する情報をどこで知りましたか。',
      en: 'Where did you find information about the Festival Events?',
    },
    type: 'multiple',
    options: [
      opt('公式ホームページ', 'Official website'),
      opt('公式SNS', 'Official SNS'),
      opt('パンフレット', 'Pamphlet'),
      opt('リーフレット', 'Leaflet'),
      opt('企画検索システム', 'Festival Events Search System'),
      other,
    ],
  },
  {
    id: 'websiteComment',
    label: {
      ja: '公式ホームページや企画検索システムを利用する中で、良かった点や改善してほしい点など、ご感想・ご意見をお聞かせください。(例：通信環境によって地図が読み込まれなかった)',
      en: 'Please share your thoughts or feedback regarding the use of the official website or Festival Events search system (e.g., what was good, areas for improvement; e.g., map failed to load due to network connection).',
    },
    type: 'text',
  },
  {
    id: 'committeeProjects',
    label: {
      ja: '印象に残った委員会開催企画を教えてください。',
      en: 'Which committee-hosted events left an impression on you?',
    },
    type: 'multiple',
    options: [
      opt('つくばお笑いライブ2026', 'Tsukuba Comedy Show 2026'),
      opt(
        'Tsukuba Trends～New value, New voice～',
        'Tsukuba Trends: New value, New voice',
      ),
      opt('夜祭パフォーマンスショー', 'Night Festival Performance Show'),
      opt('樽酒振る舞い', 'Sake Barrel Serving'),
      opt('モニュメント・イルミネーション', 'Monument Illumination'),
      opt('松美池ライトアップ', 'Matsumi Pond Light-up'),
      opt(
        '謎解き脱出ゲーム～トリック・オア・メモリー！おかしなゲームからの脱出～',
        'Mystery Solving Escape Game: Trick or Memory! Escape from the Strange Game',
      ),
      opt('つくばイチ受けたい授業', 'The Class I Most Want to Take at Tsukuba'),
      opt('実験教室', 'Science Experiment Workshop'),
      opt('受験応援', 'Entrance Exam Support Session'),
      opt('ぶらり旅企画', 'Wandering Tour'),
      opt(
        'つくば市コラボ企画「つくメモ〜つくばの思い出教えてください～」',
        "Tsukuba Collaboration Project 'Tsuku-Memo: Tell Us Your Tsukuba Memories'",
      ),
      opt('雙峰祭グランプリ 2026', 'Sohosai Grand Prix 2026'),
      opt(
        '参加していない/特にない',
        'Did not participate / None in particular',
        'exclusive',
      ),
    ],
  },
  {
    id: 'lectureComment',
    label: {
      ja: '参加した講演・座談会について、良かった点や改善してほしい点など、ご感想・ご意見をお聞かせください。',
      en: 'Please share your thoughts or feedback regarding the lectures and panel discussions you attended (e.g., what was good, areas for improvement).',
    },
    type: 'text',
    showIf: (a) => selected(a, 'committeeProjects', 'つくばイチ受けたい授業'),
  },
  {
    id: 'examSupportComment',
    label: {
      ja: '受験応援冊子や受験相談会について、良かった点や改善してほしい点など、ご感想・ご意見をお聞かせください。',
      en: 'Please share your thoughts or feedback regarding the exam support booklet or admissions consultation sessions (e.g., what was good, areas for improvement).',
    },
    type: 'text',
    showIf: (a) => selected(a, 'committeeProjects', '受験応援'),
  },
  {
    id: 'donationAwareness',
    label: {
      ja: '雙峰祭では、開催にあたり個人協賛(寄付)を募集しており、現在も受け付けています。個人協賛(寄付)を受け付けていることをご存じでしたか。',
      en: 'Sohosai accepts individual sponsorships (donations) for holding the festival and is currently open for donations. Do you know that individual sponsorships (donations) are accepted?',
    },
    type: 'single',
    options: [opt('知っていた', 'Yes'), opt('知らなかった', 'No')],
  },
  {
    id: 'overallComment',
    label: {
      ja: '第52回の学園祭の感想を自由にお聞かせください。',
      en: 'Please feel free to share your general thoughts and feedback on the 52nd Sohosai Festival.',
    },
    type: 'text',
  },
  {
    id: 'agreeTicketButton',
    label: {
      ja: '福引所にて抽選に参加される際は、来場者アンケートへの回答後に表示される、「使用済みにする」ボタンを押さないようお願いいたします。「使用済みにする」ボタンを押してしまうと、抽選に参加いただくことができません。ご了承ください。',
      en: "When participating in the raffle at the Lucky Draw Booth, please DO NOT press the 'Mark as Used' button displayed after answering the visitor survey. If you press 'Mark as Used', you will not be able to participate in the raffle.",
    },
    type: 'single',
    options: agree,
  },
  {
    id: 'agreeOncePerPerson',
    label: {
      ja: '抽選への参加は、おひとり様につき1回までとさせていただきます。',
      en: 'Participation in the raffle is limited to once per person.',
    },
    type: 'single',
    options: agree,
  },
  {
    id: 'agreePhoto',
    label: {
      ja: '福引所にて、景品と来場者の方が写った写真を撮影させていただく場合がございます。※撮影した写真は、協賛企業への報告等に使用させていただきます。また、協賛企業のホームページ等に掲載される場合がございますので、あらかじめご了承ください。なお、撮影した写真は、上記の目的以外には一切使用いたしません。顔が写らない形での撮影も可能です。',
      en: "At the Lucky Draw Booth, we may take photos of visitors with their prizes. Please note that taken photos will be used for reporting to sponsor companies, etc., and may be published on sponsor companies' websites. Taken photos will not be used for any purpose other than those stated above. Photos can also be taken without showing your face.",
    },
    type: 'single',
    options: agree,
  },
];

export const otherKey = (questionId: string) => `${questionId}Other`;

export const visibleQuestions = (answers: Answers) =>
  QUESTIONNAIRE_QUESTIONS.filter((q) => q.showIf?.(answers) ?? true);

export const isOtherSelected = (question: QuestionDef, answers: Answers) =>
  question.type !== 'text' &&
  question.options.some(
    (o) => o.kind === 'other' && selected(answers, question.id, o.label.ja),
  );

/** 選択式は必須。「その他」を選んだ場合は自由記述も必須とする。 */
export const isAnswered = (question: QuestionDef, answers: Answers) =>
  question.type === 'text' ||
  ((answers[question.id]?.length ?? 0) > 0 &&
    (!isOtherSelected(question, answers) ||
      String(answers[otherKey(question.id)] ?? '').trim() !== ''));

/** 分岐で非表示になった質問や、選択を外した「その他」の記述を送らないよう取り除く。 */
export const toSubmission = (answers: Answers): Answers => {
  const result: Answers = {};
  for (const question of visibleQuestions(answers)) {
    const answer = answers[question.id];
    if (answer === undefined) continue;
    result[question.id] = answer;
    if (isOtherSelected(question, answers)) {
      result[otherKey(question.id)] = answers[otherKey(question.id)] ?? '';
    }
  }
  return result;
};
