import { trpc } from '~/lib/trcp';
import { css } from '../../../../styled-system/css';
import TicketCard from './TicketCard';

export default function TicketList() {
  const { data: tickets, refetch } = trpc.questionnaire.myTickets.useQuery();

  return (
    <div
      className={css({
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        p: '16px',
      })}
    >
      <p className={css({ fontSize: '13px', color: 'fg.subtle' })}>
        ご回答ありがとうございました。以下の福引券を福引所でお見せください。
      </p>
      {(tickets ?? []).map((ticket) => (
        <TicketCard
          key={ticket.ticketId}
          ticket={ticket}
          onChanged={() => refetch()}
        />
      ))}
    </div>
  );
}
