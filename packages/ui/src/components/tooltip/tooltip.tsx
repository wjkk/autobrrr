'use client';

import React, { useState } from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cx } from '@aiv/ui';
import styles from './tooltip.module.css';

interface TooltipProps {
    content: React.ReactNode;
    children: React.ReactNode;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
}

export function TooltipProvider({ children }: { children: React.ReactNode }) {
    return <TooltipPrimitive.Provider delayDuration={200}>{children}</TooltipPrimitive.Provider>;
}

export function Tooltip({ children, content, side = 'top', align = 'center' }: TooltipProps) {
    const [open, setOpen] = useState(false);

    return (
        <TooltipPrimitive.Root open={open} onOpenChange={setOpen}>
            <TooltipPrimitive.Trigger asChild>
                {children}
            </TooltipPrimitive.Trigger>
            <TooltipPrimitive.Portal>
                <TooltipPrimitive.Content
                    className={cx(styles.content, open && styles.open)}
                    sideOffset={8}
                    side={side}
                    align={align}
                >
                    {content}
                    <TooltipPrimitive.Arrow className={styles.arrow} width={11} height={5} />
                </TooltipPrimitive.Content>
            </TooltipPrimitive.Portal>
        </TooltipPrimitive.Root>
    );
}
