'use client';

import {
  CollectionToolbar,
  CollectionToolbarAction,
  CollectionToolbarChips,
  CollectionToolbarGroup,
  CollectionToolbarLink,
  CollectionToolbarMeta,
  CollectionToolbarTag,
} from '@/features/shared/components/collection-toolbar';

export function PlannerPageToolbar(props: {
  mode: 'manage' | 'debug';
  debugBasePath: string;
  selectedEntry: {
    contentType: string;
    subtype: string;
    status: string;
    slug: string;
  } | null;
  releaseLabel?: string | null;
  publishing: boolean;
  onPublish: () => void;
}) {
  return (
    <CollectionToolbar>
      <CollectionToolbarGroup nowrap>
        {props.selectedEntry ? (
          <>
            <CollectionToolbarChips>
              <CollectionToolbarTag>{props.selectedEntry.contentType}</CollectionToolbarTag>
              <CollectionToolbarTag>{props.selectedEntry.subtype}</CollectionToolbarTag>
              <CollectionToolbarTag>{props.selectedEntry.status}</CollectionToolbarTag>
              <CollectionToolbarTag>{props.selectedEntry.slug}</CollectionToolbarTag>
              {props.mode === 'manage' && props.releaseLabel ? <CollectionToolbarTag>{props.releaseLabel}</CollectionToolbarTag> : null}
            </CollectionToolbarChips>
            <CollectionToolbarChips>
              {props.mode === 'manage' ? (
                <CollectionToolbarLink href={`${props.debugBasePath}/${encodeURIComponent(props.selectedEntry.slug)}`}>打开单项调试页</CollectionToolbarLink>
              ) : null}
              <CollectionToolbarLink href={`${props.debugBasePath}/compare`}>打开 A/B 对比页</CollectionToolbarLink>
              <CollectionToolbarLink href={`${props.debugBasePath}/runs`}>查看调试历史</CollectionToolbarLink>
            </CollectionToolbarChips>
          </>
        ) : (
          <CollectionToolbarMeta>当前没有可操作的子 Agent。</CollectionToolbarMeta>
        )}
      </CollectionToolbarGroup>

      <CollectionToolbarGroup align="end" nowrap>
        {props.mode === 'manage' ? (
          <CollectionToolbarAction onClick={props.onPublish} disabled={!props.selectedEntry || props.publishing}>
            {props.publishing ? '发布中…' : '发布当前草稿'}
          </CollectionToolbarAction>
        ) : (
          <CollectionToolbarMeta>围绕单个子 Agent 做试跑、回放与 A/B 诊断。</CollectionToolbarMeta>
        )}
      </CollectionToolbarGroup>
    </CollectionToolbar>
  );
}
