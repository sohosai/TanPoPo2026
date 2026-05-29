import { useParams } from 'react-router';

export default function Detail() {
  const { id } = useParams();
  return (
    <div>
      <h1>店舗詳細ページ</h1>
      <p>表示中の店舗ID: {id}</p>
    </div>
  );
}
