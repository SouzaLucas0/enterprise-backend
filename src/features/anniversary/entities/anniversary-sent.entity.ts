import { Customer } from '../../customer/entities/customer.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class AnniversarySent {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => Customer)
  @JoinColumn({ name: 'fk_customer' })
  customer: Customer

  @Column()
  isntance: string;

  @Column()
  sentDate: Date;

  @Column()
  message: string;
}
