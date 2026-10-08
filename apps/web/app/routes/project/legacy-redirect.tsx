import { Navigate, useLocation, useParams } from 'react-router';

export default function LegacyShopRedirect() {
  const { number } = useParams();
  const { search, hash } = useLocation();
  return <Navigate to={`/project/${number}${search}${hash}`} replace />;
}
