# Unblock and Flow

Unblock and Flow は、Next.js と Supabase を使用して構築されたモダンな Web アプリケーションです。
スムーズな作業フローを実現し、生産性を向上させることを目的として開発されています。

## 主な機能 (開発中を含む)

*   **モダンな UI/UX**: Tailwind CSS と Radix UI を採用した、美しく使いやすいインターフェース。
*   **タスク管理**: `@dnd-kit` を使用したドラッグ & ドロップによる直感的な操作。
*   **データ可視化**: Recharts を使用した進捗やデータのグラフ表示。
*   **リアルタイム連携**: Supabase をバックエンドに採用し、データの保存と同期を実現。
*   **テーマ対応**: ダークモードなど、ユーザーの好みに合わせた表示設定。

## 技術スタック

*   **フレームワーク**: [Next.js](https://nextjs.org/) (App Router)
*   **言語**: TypeScript
*   **スタイリング**: Tailwind CSS v4
*   **UI コンポーネント**: Radix UI, Lucide React
*   **バックエンド / データベース**: Supabase
*   **その他**: dnd-kit, Recharts, Sonner, Next Themes

## 開発の始め方

必要な依存関係をインストールした後、開発サーバーを起動してください。

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
# または
yarn dev
# または
pnpm dev
# または
bun dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開くと、アプリケーションを確認できます。
