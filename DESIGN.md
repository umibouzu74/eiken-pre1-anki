# 英検準1級 単語マスター — 設計書

## 概要

英検準1級の語彙学習アプリ。先生が生徒の進捗を管理でき、生徒はフラッシュカード・4択・タイピングで学習する。

- **フロントエンド**: React 18 + Vite + Tailwind CSS + React Router (HashRouter)
- **バックエンド**: Firebase (Firestore + Auth)
- **ホスティング**: GitHub Pages
- **想定規模**: 10〜30名の生徒

---

## 認証方式

### 生徒
1. クラスコード（先生が発行、例: `spring2026`）を入力
2. 名前を入力 → Firestore に自動登録
3. 匿名認証（Firebase Anonymous Auth）でセッション管理
4. 同じクラスコード＋名前で再ログイン → 既存データに紐づけ

### 先生
1. メールアドレス＋パスワードでログイン（Firebase Auth）
2. 初期は Takumi さん1人分を手動で Firebase Console から作成
3. ログイン後は管理ダッシュボードにリダイレクト

---

## Firestore データモデル

```
/teachers/{uid}
  - displayName: "Takumi"
  - email: "..."
  - createdAt: Timestamp

/classes/{classCode}
  - name: "高3英語A"
  - teacherUid: "xxx"
  - createdAt: Timestamp
  - studentCount: 0  (increment on join)

/students/{autoId}
  - name: "田中太郎"
  - classCode: "spring2026"
  - firebaseUid: "anonymous-uid"  (Anonymous Auth UID)
  - joinedAt: Timestamp
  - lastActiveAt: Timestamp

/progress/{studentId}
  - words: {
      "1":  { s: "mastered", c: 3, w: 1, t: Timestamp },
      "2":  { s: "learning", c: 1, w: 2, t: Timestamp },
      ...
    }
  ※ s=status, c=correctCount, w=wrongCount, t=lastReviewed
  ※ 1ドキュメントに全単語のステータスをMapで格納（1680語でも1MB以内）

/assignments/{autoId}
  - classCode: "spring2026"
  - title: "Unit 1-3 復習"
  - rangeFrom: 1
  - rangeTo: 150
  - mode: "flashcard" | "quiz4" | "quizType" | "any"
  - dueDate: Timestamp | null
  - createdAt: Timestamp
  - active: true

/results/{autoId}
  - studentId: "xxx"
  - assignmentId: "yyy" | null
  - classCode: "spring2026"
  - mode: "quiz4"
  - rangeFrom: 1
  - rangeTo: 50
  - correct: 42
  - wrong: 8
  - total: 50
  - completedAt: Timestamp
  - details: [
      { wordId: 1, correct: true },
      { wordId: 2, correct: false },
      ...
    ]
```

### Security Rules (概要)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // クラスは誰でも読める（コード入力で存在確認）
    match /classes/{code} {
      allow read: if true;
      allow write: if request.auth != null
        && get(/databases/$(database)/documents/teachers/$(request.auth.uid)).data != null;
    }

    // 生徒は自分のデータのみ読み書き
    match /students/{id} {
      allow read: if true;  // 先生もダッシュボードで読む
      allow create: if request.auth != null;
      allow update: if request.auth != null
        && resource.data.firebaseUid == request.auth.uid;
    }

    // 進捗は本人のみ書き込み、先生は読める
    match /progress/{studentId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // 宿題は先生のみ作成、生徒は読める
    match /assignments/{id} {
      allow read: if true;
      allow write: if request.auth != null
        && get(/databases/$(database)/documents/teachers/$(request.auth.uid)).data != null;
    }

    // テスト結果は本人が書き込み、先生が読める
    match /results/{id} {
      allow read: if true;
      allow create: if request.auth != null;
    }
  }
}
```

---

## ページ構成・ルーティング

```
/#/                     → ログイン画面（クラスコード＋名前 or 先生ログイン）
/#/student              → 生徒ホーム（学習モード選択、宿題一覧、進捗）
/#/student/flashcard    → フラッシュカード
/#/student/quiz4        → 4択クイズ
/#/student/typing       → タイピングテスト
/#/student/results      → テスト結果画面

/#/teacher              → 先生ダッシュボード
/#/teacher/class/:code  → クラス詳細（生徒一覧＋進捗）
/#/teacher/student/:id  → 生徒詳細（個別進捗）
/#/teacher/assign       → 宿題作成・管理
/#/teacher/export       → CSVエクスポート
```

---

## 画面仕様

### 1. ログイン画面 (`/#/`)

- **生徒タブ**: クラスコード入力 → 名前入力 → 「はじめる」
- **先生タブ**: メール＋パスワード → 「ログイン」
- クラスコードが存在しない場合はエラー表示
- 同じ名前＋コードで再ログイン時は既存データに接続

### 2. 生徒ホーム (`/#/student`)

- **上部**: 名前、クラス名、学習統計（覚えた/学習中/未学習）
- **宿題セクション**: 先生が配信した宿題のカード一覧（期限、範囲、モード）
- **自由学習セクション**: モード選択カード（フラッシュカード/4択/タイピング）
- **ユニット一覧**: 50語ずつのグリッド、進捗バー付き

### 3. 学習画面（フラッシュカード/4択/タイピング）

- 前回作成した HTML 版と同じ UI・機能
- 範囲選択 → シャッフル/除外オプション → 学習開始
- 結果を Firestore に自動保存
- SRS（間隔反復）: 正解→次回の出題間隔を延長、不正解→短縮

### 4. 先生ダッシュボード (`/#/teacher`)

- **クラス一覧**: 作成済みクラスのカード（生徒数、平均進捗率）
- **クラス作成**: クラス名入力 → コード自動生成
- **全体統計**: 全クラス合計の学習状況

### 5. クラス詳細 (`/#/teacher/class/:code`)

- **生徒一覧テーブル**:
  - 名前 | 覚えた | 学習中 | 未学習 | 最終ログイン | 詳細→
  - ソート可能（名前順、進捗順）
- **宿題一覧**: 配信済み宿題とその完了状況
- **クイック操作**: 宿題追加、CSVエクスポート

### 6. 生徒詳細 (`/#/teacher/student/:id`)

- **進捗グラフ**: 日別の学習語数の推移（recharts）
- **ユニット別進捗**: ユニットごとの達成率バー
- **テスト結果履歴**: 実施日時、モード、スコア
- **苦手単語リスト**: 不正解率の高い単語一覧

### 7. 宿題管理 (`/#/teacher/assign`)

- **宿題作成フォーム**:
  - クラス選択
  - タイトル
  - 範囲（開始番号〜終了番号）
  - モード（フラッシュカード/4択/タイピング/自由）
  - 期限（任意）
- **配信済み一覧**: 完了率付きの宿題リスト

### 8. CSVエクスポート (`/#/teacher/export`)

- クラス選択 → エクスポート範囲選択
- 出力形式:
  - **進捗一覧CSV**: 生徒名, 覚えた数, 学習中, 未学習, 最終ログイン
  - **テスト結果CSV**: 生徒名, 日時, モード, 範囲, 正解, 不正解, スコア
  - **単語別正答率CSV**: 単語, 全体正答率, 生徒別正答率...

---

## SRS（間隔反復）アルゴリズム

簡易版 SM-2 をベースにする:

```javascript
// 各単語のSRSデータ
{
  interval: 1,      // 次の復習までの日数
  easeFactor: 2.5,  // 容易さ係数
  repetitions: 0,   // 連続正解回数
  nextReview: Date,  // 次の復習予定日
}

function updateSRS(card, quality) {
  // quality: 0=もう一度, 1=微妙, 2=覚えた, 3=簡単
  if (quality < 2) {
    card.repetitions = 0;
    card.interval = 1;
  } else {
    card.repetitions++;
    if (card.repetitions === 1) card.interval = 1;
    else if (card.repetitions === 2) card.interval = 3;
    else card.interval = Math.round(card.interval * card.easeFactor);
  }
  card.easeFactor = Math.max(1.3,
    card.easeFactor + (0.1 - (3 - quality) * (0.08 + (3 - quality) * 0.02))
  );
  card.nextReview = addDays(new Date(), card.interval);
}
```

---

## 単語データ

- `src/data/words.json` に全1680語を格納（前回変換済み）
- ビルド時にバンドルされる（サーバー不要）
- フィールド:

```typescript
interface Word {
  i: number;           // ID (1-1680)
  w: string;           // 英単語
  p: string;           // 発音記号
  m: string;           // 品詞・意味
  sm: string;          // 短縮意味
  bs: string;          // 穴あき例文
  bj: string;          // 例文日本語訳
  cj: string;          // 活用形（穴あきの正解）
  ee: string;          // 例文英語
  ej: string;          // 例文日本語
  sy?: string;         // 同意語
  us?: string;         // 語法
  dv?: string;         // 派生語
  et?: string;         // 語源
}
```

---

## プロジェクト構成

```
vocab-master/
├── public/
├── src/
│   ├── components/
│   │   ├── common/          # 共通UI（Button, Card, Modal, etc.）
│   │   ├── auth/            # ログイン関連
│   │   │   ├── LoginPage.jsx
│   │   │   └── AuthContext.jsx
│   │   ├── student/         # 生徒側
│   │   │   ├── StudentHome.jsx
│   │   │   ├── Flashcard.jsx
│   │   │   ├── Quiz4.jsx
│   │   │   ├── QuizTyping.jsx
│   │   │   ├── RangeSelector.jsx
│   │   │   └── Results.jsx
│   │   └── teacher/         # 先生側
│   │       ├── Dashboard.jsx
│   │       ├── ClassDetail.jsx
│   │       ├── StudentDetail.jsx
│   │       ├── AssignmentForm.jsx
│   │       └── ExportCSV.jsx
│   ├── hooks/
│   │   ├── useAuth.js        # 認証フック
│   │   ├── useProgress.js    # 進捗の読み書き
│   │   ├── useSRS.js         # SRSロジック
│   │   └── useAssignments.js # 宿題管理
│   ├── lib/
│   │   ├── firebase.js       # Firebase初期化
│   │   ├── srs.js            # SRSアルゴリズム
│   │   └── csv.js            # CSVエクスポート
│   ├── data/
│   │   └── words.json        # 単語データ
│   ├── App.jsx               # ルーティング
│   ├── main.jsx              # エントリポイント
│   └── index.css             # Tailwind + カスタムCSS
├── firebase.json             # Firestore設定
├── firestore.rules           # セキュリティルール
├── .firebaserc
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── DESIGN.md                 # この設計書
└── README.md
```

---

## 開発フェーズ

### Phase 1: 基盤構築
- [ ] Vite + React + Tailwind プロジェクト初期化
- [ ] Firebase プロジェクト作成・初期化
- [ ] 単語データ JSON の組み込み
- [ ] HashRouter でルーティング設定
- [ ] 認証コンテキスト（AuthContext）の実装

### Phase 2: 生徒側の学習機能
- [ ] ログイン画面（クラスコード＋名前）
- [ ] 生徒ホーム画面
- [ ] フラッシュカード（既存ロジック移植＋Firestore保存）
- [ ] 4択クイズ（同上）
- [ ] タイピングテスト（同上）
- [ ] テスト結果画面＋Firestore記録
- [ ] SRSアルゴリズム統合

### Phase 3: 先生側の管理機能
- [ ] 先生ログイン画面
- [ ] ダッシュボード（クラス一覧）
- [ ] クラス作成・コード発行
- [ ] クラス詳細（生徒一覧＋進捗テーブル）
- [ ] 生徒詳細（進捗グラフ、テスト履歴）
- [ ] 宿題作成・配信
- [ ] CSVエクスポート

### Phase 4: 仕上げ
- [ ] レスポンシブ対応（スマホ最適化）
- [ ] PWA化（オフラインキャッシュ）
- [ ] GitHub Pages デプロイ設定
- [ ] Firestore Security Rules 本番設定
- [ ] README / 使い方ガイド

---

## 技術メモ

### Firebase 無料枠 (Spark)
- Firestore: 1GB ストレージ、50K reads/日、20K writes/日
- Auth: 無制限
- 30人×1680語 = 約50,400レコード → 1ドキュメントにMapで入れれば30ドキュメントで済む
- 十分余裕あり

### GitHub Pages + Firebase の組み合わせ
- 静的ファイルは GitHub Pages（無料）
- Firebase は DB + Auth のみ（APIキーはフロントエンドに露出するが、Security Rules で保護）
- `vite.config.js` で `base` を設定して GitHub Pages 用にビルド

### 既存 Listening Lab との整合性
- 同じ React + Vite + HashRouter 構成で統一
- 将来的にはリンクで行き来できるようにも
