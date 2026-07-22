import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('app_meta')
export class AppMeta {
  @PrimaryColumn()
  key: string;

  @Column()
  value: string;
}
