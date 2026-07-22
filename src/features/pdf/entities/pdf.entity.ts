import { Customer } from "../../customer/entities/customer.entity";
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity()
export class Pdf {
    @PrimaryColumn()
    id: string

    @Column({ type: 'text', default: null, nullable: true })
    ourNumber: string | null

    @Column({ type: 'text', default: null, nullable: true })
    nfeNumber: string | null

    @Column({ default: false })
    sentBankSlip: boolean

    @Column({ default: false })
    sentNfe: boolean

    @CreateDateColumn()
    createdAt: Date

    @UpdateDateColumn()
    updatedAt: Date

    @Column({ default: true })
    active: boolean

    @ManyToOne(() => Customer)
    @JoinColumn({ name: 'fk_customer' })
    customer: Customer
}
