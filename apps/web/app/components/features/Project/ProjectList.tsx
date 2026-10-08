import type { Project } from 'api';
import type { CSSProperties } from 'react';
import { useFavorites } from '~/lib/favorites';
import { usePlaces } from '~/lib/places';
import ProjectListItem from './ProjectListItem';

/** 企画の行を並べる。お気に入りと場所ラベルはここで解決するため、使う側は企画の配列だけ渡す。 */
export default function ProjectList({
  projects,
  rowProps,
}: {
  projects: Project[];
  /** 入場演出などを行ごとに足すため */
  rowProps?: (index: number) => { className?: string; style?: CSSProperties };
}) {
  const { isFavorite, toggle } = useFavorites();
  const { formatProjectLocation } = usePlaces();

  return projects.map((project, i) => (
    <ProjectListItem
      key={project.id}
      project={project}
      locationLabel={formatProjectLocation(project)}
      favorite={isFavorite(project.id)}
      onToggleFavorite={toggle}
      {...rowProps?.(i)}
    />
  ));
}
