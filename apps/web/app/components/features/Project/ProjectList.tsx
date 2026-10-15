import type { Project } from 'api';
import type { CSSProperties } from 'react';
import { useFavorites } from '~/lib/favorites';
import { usePlaces } from '~/lib/places';
import ProjectListItem from './ProjectListItem';

/** 企画の行を並べる。お気に入りと場所ラベルはここで解決するため、使う側は企画の配列だけ渡す。 */
export default function ProjectList({
  projects,
  visibleIds,
  rowProps,
}: {
  projects: Project[];
  /** 渡すと、ここに無い企画の行を作り直さずに隠す。 */
  visibleIds?: ReadonlySet<string>;
  /** 入場演出などを行ごとに足すため。index は見えている行の中での順番 */
  rowProps?: (index: number) => { className?: string; style?: CSSProperties };
}) {
  const { isFavorite, toggle } = useFavorites();
  const { formatProjectLocation } = usePlaces();

  let visibleIndex = 0;
  return projects.map((project) => {
    const hidden = visibleIds ? !visibleIds.has(project.id) : false;
    return (
      <ProjectListItem
        key={project.id}
        project={project}
        locationLabel={formatProjectLocation(project)}
        favorite={isFavorite(project.id)}
        onToggleFavorite={toggle}
        hidden={hidden}
        {...(hidden ? {} : rowProps?.(visibleIndex++))}
      />
    );
  });
}
