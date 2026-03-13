# 英検準1級 単語マスター (Vocab Master)

英検準1級の語彙学習アプリ。フラッシュカード・4択クイズ・タイピングテストで1,680語を学習。先生が生徒の進捗を管理できる。

## 技術スタック

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Firebase (Firestore + Auth)
- **Hosting**: GitHub Pages
- **ルーティング**: HashRouter（GitHub Pages対応）

---

## セットアップ手順

### 1. Firebase プロジェクトを作成

1. [Firebase Console](https://console.firebase.google.com/) にアクセス
2. 「プロジェクトを追加」→ プロジェクト名を入力（例: `vocab-master`）
3. Google Analytics は「無効」でOK → 「プロジェクトを作成」

### 2. Firebase の各機能を有効化

#### Authentication
1. Firebase Console → 「Authentication」→ 「始める」
2. 「Sign-in method」タブ:
   - **匿名（Anonymous）** を有効化 ← 生徒用
   - **メール/パスワード** を有効化 ← 先生用
3. 「Users」タブ → 「ユーザーを追加」:
   - 先生用アカウントを作成（メール + パスワード）
   - 作成後、表示される **UID** をメモ

#### Firestore
1. Firebase Console → 「Firestore Database」→ 「データベースを作成」
2. 「テストモードで開始」→ ロケーション: `asia-northeast1`（東京）
3. 「ルール」タブ → `firestore.rules` の内容を貼り付け → 「公開」

#### 先生データの初期登録
1. Firestore → 「コレクションを開始」
2. コレクション ID: `teachers`
3. ドキュメント ID: **先生のUID**（Authentication でメモしたもの）
4. フィールド:
   - `displayName` (string): `"Takumi"`
   - `email` (string): `"your-email@example.com"`
   - `createdAt` (timestamp): 現在時刻

#### 最初のクラスを作成
1. Firestore → 「コレクションを開始」
2. コレクション ID: `classes`
3. ドキュメント ID: クラスコード（例: `spring2026`）
4. フィールド:
   - `name` (string): `"高3英語A"`
   - `teacherUid` (string): 先生のUID
   - `createdAt` (timestamp): 現在時刻
   - `studentCount` (number): `0`

### 3. Web アプリの登録

1. Firebase Console → ⚙️（プロジェクト設定）→ 「マイアプリ」
2. 「Web」（`</>`アイコン）をクリック
3. アプリのニックネーム: `vocab-master`
4. 「Firebase Hosting」はチェック不要
5. 「アプリを登録」→ 表示される `firebaseConfig` をコピー

### 4. プロジェクトに設定を反映

`src/lib/firebase.js` を開き、`firebaseConfig` を貼り付け:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "vocab-master-xxxxx.firebaseapp.com",
  projectId: "vocab-master-xxxxx",
  storageBucket: "vocab-master-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
}
```

### 5. ローカル開発

```bash
npm install
npm run dev
```

`http://localhost:5173` でアプリが起動します。

### 6. GitHub Pages にデプロイ

```bash
# リポジトリ名に合わせて vite.config.js の base を変更
# 例: base: '/vocab-master/'

npm run deploy
```

GitHub → Settings → Pages で `gh-pages` ブランチを確認。

---

## 使い方

### 生徒

1. アプリを開く
2. 先生から教えてもらったクラスコードを入力
3. 自分の名前を入力 → 「はじめる」
4. 学習モードを選択して学習開始

### 先生

1. アプリを開く
2. 「先生」タブでメール＋パスワードでログイン
3. ダッシュボードで生徒の進捗を確認
4. 宿題を配信、CSVエクスポート

---

## プロジェクト構成

```
src/
├── components/
│   ├── auth/          # ログイン・認証
│   ├── student/       # 生徒側の画面
│   └── teacher/       # 先生側の画面（Phase 3）
├── hooks/             # カスタムフック
├── lib/               # Firebase, SRS, CSV
├── data/              # 単語データ（words.json）
├── App.jsx            # ルーティング
└── main.jsx           # エントリポイント
```

## 開発フェーズ

- [x] Phase 1: 基盤構築（React + Firebase + 認証）
- [x] Phase 2: 生徒側の学習機能
- [ ] Phase 3: 先生側の管理ダッシュボード
- [ ] Phase 4: PWA化・仕上げ
