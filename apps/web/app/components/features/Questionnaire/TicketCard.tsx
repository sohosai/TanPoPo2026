import {
  IconAlertTriangle,
  IconCircleCheckFilled,
  IconTicket,
} from '@tabler/icons-react';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from 'api';
import { trpc } from '~/lib/trcp';
import { css } from '../../../../styled-system/css';
import RedemptionSchedule from './RedemptionSchedule';

export type Ticket =
  inferRouterOutputs<AppRouter>['questionnaire']['myTickets'][number];

type TicketCardProps = {
  ticket: Ticket;
  onChanged: () => void;
};

export default function TicketCard({ ticket, onChanged }: TicketCardProps) {
  const markUsed = trpc.questionnaire.markUsed.useMutation({
    onSuccess: onChanged,
  });

  if (ticket.status === 'used') {
    return (
      <div
        className={css({
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          p: '20px',
          borderRadius: '12px',
          border: '1px solid',
          borderColor: 'border',
          bg: 'surface',
        })}
      >
        <span
          className={css({
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            px: '14px',
            py: '7px',
            borderRadius: '999px',
            bg: 'fg.muted',
            color: 'surface',
            fontSize: '14px',
            fontWeight: 'bold',
          })}
        >
          <IconCircleCheckFilled size={18} />
          使用済み
        </span>
      </div>
    );
  }

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        p: '16px',
        borderRadius: '12px',
        border: '1px solid',
        borderColor: 'accent.border',
        bg: 'surface',
      })}
    >
      <div
        className={css({ display: 'flex', alignItems: 'center', gap: '10px' })}
      >
        <span
          className={css({
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '999px',
            bg: 'accent.subtle',
            color: 'accent',
          })}
        >
          <IconTicket size={20} />
        </span>
        <div className={css({ flex: 1 })}>
          <p
            className={css({
              fontSize: '14px',
              fontWeight: 'bold',
              color: 'fg.strong',
            })}
          >
            福引券（{ticket.personIndex}人目）
          </p>
          <p
            className={css({
              fontSize: '12px',
              color: 'accent',
              fontWeight: 'bold',
            })}
          >
            未使用
          </p>
        </div>
      </div>

      <div
        className={css({
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          p: '10px',
          borderRadius: '8px',
          bg: 'rgba(255, 107, 129, 0.1)',
          color: 'favorite',
        })}
      >
        <IconAlertTriangle
          size={18}
          className={css({ flexShrink: 0, mt: '1px' })}
        />
        <p
          className={css({
            fontSize: '12px',
            fontWeight: 'bold',
            lineHeight: 1.6,
          })}
        >
          福引所の係員がこの画面を操作するので、「使用済み」をタップしないようお願いします。
        </p>
      </div>

      <RedemptionSchedule />

      <button
        type="button"
        disabled={markUsed.isPending}
        onClick={() => markUsed.mutate({ ticketId: ticket.ticketId })}
        className={css({
          width: '100%',
          py: '10px',
          borderRadius: '999px',
          border: '1px solid',
          borderColor: 'accent',
          bg: 'transparent',
          color: 'accent',
          fontSize: '13px',
          cursor: markUsed.isPending ? 'not-allowed' : 'pointer',
        })}
      >
        {markUsed.isPending ? '処理中...' : '使用済みにする（係員用）'}
      </button>
    </div>
  );
}
