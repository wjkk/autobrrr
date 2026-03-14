'use client';

import styles from './planner-agent-debug-page.module.css';

import type { PlannerStepDefinitionEditorItem } from '../lib/planner-agent-debug-types';

interface PlannerStepDefinitionEditorProps {
  value: PlannerStepDefinitionEditorItem[];
  onChange: (nextValue: PlannerStepDefinitionEditorItem[]) => void;
}

function createStepDefinition(): PlannerStepDefinitionEditorItem {
  return {
    id: `step-${Math.random().toString(36).slice(2, 8)}`,
    title: '',
    status: 'done',
    details: [''],
  };
}

export function PlannerStepDefinitionEditor({ value, onChange }: PlannerStepDefinitionEditorProps) {
  const updateStep = (index: number, updater: (current: PlannerStepDefinitionEditorItem) => PlannerStepDefinitionEditorItem) => {
    onChange(value.map((step, currentIndex) => (currentIndex === index ? updater(step) : step)));
  };

  const removeStep = (index: number) => {
    onChange(value.filter((_, currentIndex) => currentIndex !== index));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= value.length) {
      return;
    }

    const nextValue = [...value];
    const [item] = nextValue.splice(index, 1);
    nextValue.splice(nextIndex, 0, item);
    onChange(nextValue);
  };

  return (
    <div className={styles.stepEditorStack}>
      {value.map((step, index) => (
        <div key={`${step.id}-${index}`} className={styles.stepCard}>
          <div className={styles.stepCardHeader}>
            <div className={styles.stepCardMeta}>
              <span className={styles.stepIndex}>步骤 {index + 1}</span>
              <input
                className={styles.input}
                placeholder="step id，例如 dialogue_conflict"
                value={step.id}
                onChange={(event) => updateStep(index, (current) => ({ ...current, id: event.target.value }))}
              />
            </div>
            <div className={styles.stepToolbar}>
              <button type="button" className={styles.inlineButton} onClick={() => moveStep(index, -1)} disabled={index === 0}>
                上移
              </button>
              <button type="button" className={styles.inlineButton} onClick={() => moveStep(index, 1)} disabled={index === value.length - 1}>
                下移
              </button>
              <button type="button" className={styles.inlineButtonDanger} onClick={() => removeStep(index)} disabled={value.length <= 1}>
                删除步骤
              </button>
            </div>
          </div>

          <div className={styles.twoCol}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Title</label>
              <input
                className={styles.input}
                placeholder="例如：设计对白驱动的冲突推进"
                value={step.title}
                onChange={(event) => updateStep(index, (current) => ({ ...current, title: event.target.value }))}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Status</label>
              <select
                className={styles.select}
                value={step.status}
                onChange={(event) =>
                  updateStep(index, (current) => ({
                    ...current,
                    status: event.target.value as PlannerStepDefinitionEditorItem['status'],
                  }))
                }
              >
                <option value="pending">pending</option>
                <option value="running">running</option>
                <option value="done">done</option>
                <option value="failed">failed</option>
              </select>
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <div className={styles.fieldLabelRow}>
              <label className={styles.fieldLabel}>Details</label>
              <button
                type="button"
                className={styles.inlineButton}
                onClick={() =>
                  updateStep(index, (current) => ({
                    ...current,
                    details: [...current.details, ''],
                  }))
                }
              >
                添加 detail
              </button>
            </div>
            <div className={styles.detailList}>
              {step.details.map((detail, detailIndex) => (
                <div key={`${step.id}-detail-${detailIndex}`} className={styles.detailRow}>
                  <textarea
                    className={styles.detailTextarea}
                    placeholder="例如：通过对白建立关系和冲突"
                    value={detail}
                    onChange={(event) =>
                      updateStep(index, (current) => ({
                        ...current,
                        details: current.details.map((item, currentDetailIndex) =>
                          currentDetailIndex === detailIndex ? event.target.value : item,
                        ),
                      }))
                    }
                  />
                  <button
                    type="button"
                    className={styles.inlineButtonDanger}
                    onClick={() =>
                      updateStep(index, (current) => ({
                        ...current,
                        details: current.details.filter((_, currentDetailIndex) => currentDetailIndex !== detailIndex),
                      }))
                    }
                    disabled={step.details.length <= 1}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}

      <button type="button" className={styles.buttonGhost} onClick={() => onChange([...value, createStepDefinition()])}>
        添加步骤
      </button>
    </div>
  );
}
