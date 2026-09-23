import { css } from '../../../../styled-system/css';
import TicketCard from './TicketCard';

type Ticket = {
  ticketId: string;
  status: 'unused' | 'used';
  personIndex: number;
};

type TicketListProps = {
  tickets: Ticket[];
  onChanged: () => void;
};

export default function TicketList({ tickets, onChanged }: TicketListProps) {
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
      {tickets.map((ticket) => (
        <TicketCard
          key={ticket.ticketId}
          ticket={ticket}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}
