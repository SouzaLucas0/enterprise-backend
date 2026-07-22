import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common'
import { CustomerService } from './customer.service'
import { CreateCustomerDto } from './dto/create-customer.dto'
import { UpdateCustomerDto } from './dto/update-customer.dto'

@Controller('customer')
export class CustomerController {
	constructor(private readonly customerService: CustomerService) {}

	@Post()
	async create(@Body() createCustomerDto: CreateCustomerDto) {
		return await this.customerService.createCustomer(createCustomerDto)
	}

	@Get()
	async findAll() {
		return await this.customerService.findAllCustomers()
	}

	@Get(':id')
	async findOne(@Param('id') id: string) {
		return await this.customerService.findOneCustomer(id)
	}

	@Patch(':id')
	async update(@Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
		return await this.customerService.updateCustomer(id, updateCustomerDto)
	}

	@Delete(':id')
	async remove(@Param('id') id: string) {
		return await this.customerService.disableCustomer(id)
	}
}
