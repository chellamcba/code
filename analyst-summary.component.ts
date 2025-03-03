import { Component, OnInit, ViewChild, Output, EventEmitter } from '@angular/core';
import { Observable, forkJoin } from '../../../core/rxjs-extensions';
import { CreditService } from '../../services/credit-service';
import { GetCreditDashboardDataRequest } from '../../services/get-credit-dashboard-data-request';
import { AppSettingsService } from "app/core/services/app-settings.service/app-settings.service";
import { GetCreditApplicationDetailResponse } from "../../services/get-credit-application-detail-response";
import { CreditApplicationDetail, Address } from "../../services/credit-application-detail";
import { CreditReference } from "../../services/credit-reference";
import { CustomerLookupService } from "app/credit/services/customer-lookup-service";
import { GetCustomerDetailRequest } from "app/credit/services/get-customer-detail-request";
import { GetCustomerDetailResponse } from "app/credit/services/get-customer-detail-response";
import { Customer } from "app/credit/services/get-customer-lookup-data-response";
import { SaveCreditApplicationDetailRequest } from "app/credit/services/save-credit-application-detail-request";
import { Credit_WorkFlow_Status, Credit_RequesType, Utils } from "app/shared/utils/utils";
import { NgForm } from '@angular/forms';
import { GetAnalystListResponse } from "app/credit/services/get-analyst-list-response";
import { Analyst } from "app/credit/services/Analyst";
import * as _ from "lodash";

@Component({
	selector: 'credit-analyst-summary',
	templateUrl: './analyst-summary.component.html',
	styleUrls: ['./analyst-summary.component.css']
})
export class CreditAnalystSummaryComponent implements OnInit {
	@ViewChild('freezeform') public freezeform: NgForm;

	//@Output()
	//public closeRequest: EventEmitter<any> = new EventEmitter();
	public model: CreditApplicationDetail = new CreditApplicationDetail();
	// public loading: boolean = false;
	public statuses: Array<{ text: string, value: number }> = [
		{ text: "Approved", value: 5 },
		{ text: "Denied", value: 7 },
		{ text: "In Process", value: 3 },
		{ text: "Pending", value: 4 },
		{ text: "Received", value: 2 }];
	public analysts: Array<{ text: string, value: number, isSupervisor: boolean, isAdministrator: boolean }> = null;
	public analystsBackupData: Array<{ text: string, value: number, isSupervisor: boolean, isAdministrator: boolean }> = null;

	public selectedAssignTo: { text: string, value: number } = null;

	public selectedStatusAssigned: { text: string, value: number } = null;
	public phoneNumberMask: string = "(999) 000-0000"; // Phone number formatter
	public countries: Array<any> = [
		{ text: "USA", value: "US" },
		{ text: "Canada", value: "CA" },
		{ text: "Mexico", value: "MX" }
	];
	public isBillToIncorrect: boolean = false;
	public isShipperIncorrect: boolean = false;
	public evaluatedBillToNumber: number = null;
	public evaluatedShipperNumber: number = null;
	public isSave: boolean = true;
	public isRefreshParentDashboard: boolean = false;
	public statusErrorHighlight: boolean = null;
	public assignToErrorHighlight: boolean = null;
	public isAnalyst: boolean = false;

	public shipperFlag: string = null;
	public consigneeFlag: string = null;
	public billToFlag: string = null;
	public billToFlagBIT: string = null;
	public defaultBillToFlag: string = null;
	public defaultBillToFlagBIT: string = null;
	public defaultBillToNumber: number = null;
	public updatedCustomerInformationStatus: string = null;
	public updatedBillToCustomerStatus: string = null;
	public availableCredit: number = null;
	public creditLimit: number = null;

	public updatedShipperFlag: string = null;
	public updatedConsigneeFlag: string = null;
	public updatedBillToFlag: string = null;
	public updatedBillToFlagBIT: string = null;
	public updatedDefaultBillToFlag: string = null;
	public updatedDefaultBillToFlagBIT: string = null;
	public updatedDefaultBillToNumber: number = null;

	public billingReqList: Array<any> = [];
	public selectedBillingRequirementsList: any[] = null;


	constructor(private creditService: CreditService, private appSettingsService: AppSettingsService, private customerService: CustomerLookupService) {
	}

	ngOnInit() {

		if (this.appSettingsService.canViewAnalystApp) {
			this.loadAnalystSummaryView();
			this.isAnalyst = true;
		}
		else if (this.appSettingsService.canViewAgentApp) {
			this.loadAgentSummaryView();
		}
	}

	loadAnalystSummaryView() {
		let AnalystList = this.getAnalystList();
		let CreditApplicationDetail = this.getCreditApplicationData();
		let BillingSelection = this.getBillingSelectionData();
		forkJoin(AnalystList, CreditApplicationDetail, BillingSelection).subscribe(() => {
			let preselectStatus = this.statuses.filter((input) => input.value === this.model.statusId);
			this.selectedStatusAssigned = preselectStatus && preselectStatus.length > 0 && preselectStatus[0] || undefined;
			this.valueStatusChange();
			this.setBillingReqList();
		}, err => console.error(err));
	}

	loadAgentSummaryView() {
		let CreditApplicationDetail = this.getCreditApplicationData();
		let BillingSelection = this.getBillingSelectionData();
		forkJoin(CreditApplicationDetail, BillingSelection).subscribe(() => {
			this.setBillingReqList();
		}, err => console.error(err));
	}

	getAnalystList() {
		var analystList = this.creditService.getAnalystList().subscribe((result: GetAnalystListResponse) => {
			if (result && result.analysts && !result.errors.hasErrors) {
				this.analystsBackupData = result.analysts.map((input: Analyst) => {
					return { text: input.lastNameText + ',' + input.firstNameText, value: input.lsuniqueId, isSupervisor: input.isSupervisor, isAdministrator: input.isAdministrator };
				});
			}
		})
		return analystList;
	}

	getCreditApplicationData() {
		var creditApplicationDetails = this.creditService.getCreditRequest.subscribe(this.creditService.CreditRequestIdFromAnalystDashboard).subscribe((result: GetCreditApplicationDetailResponse) => {
			if (result && result.creditApplicationDetail) {

				this.model = this.preProcessCredit(result.creditApplicationDetail);
				console.log(" --- Credit Request Data -----", this.model);

				if (this.model.creditReferences && this.model.creditReferences.length === 0) {
					this.model.creditReferences = [new CreditReference(), new CreditReference(), new CreditReference()];
				}
				this.computeFlagLogicForCustomer(result.creditApplicationDetail);
				this.computeFlagLogicForBilling(result.creditApplicationDetail);
				this.computeFlagLogicForUpdatedCustomer(result.creditApplicationDetail)
				this.computeFlagLogicForUpdatedBilling(result.creditApplicationDetail)

				console.log("Successfully got Credit request Application data");
				console.log("On init after pre processing", this.model);
			}
			else
				console.log(`Failed to get Credit Detail for id ${this.creditService.CreditRequestIdFromAnalystDashboard}`);

		})
		return creditApplicationDetails;
	}

	getBillingSelectionData() {
		var BillingSelection = this.creditService.getBillingSectionList().then((result: any) => {
			this.billingReqList = result.billingRequirements;
		})
		return BillingSelection;
	}

	setBillingReqList() {
		const optedBillingReqIds = this.model.billingRequirementIds;
		const filteredList = _.filter(this.billingReqList, function (o) { return _.includes(optedBillingReqIds, o.id) });
		this.selectedBillingRequirementsList = _.map(filteredList, 'description');
	}

	

	valueStatusChange(event?: any) {
		if (this.selectedStatusAssigned && this.selectedStatusAssigned.value === Credit_WorkFlow_Status.PEND) {
			
			if (this.appSettingsService.canAccessCreditAdminView) {
				this.analysts = this.analystsBackupData.filter((input) => {
					return input.value !== this.appSettingsService.user.lsUniqueId;
				});
			}
			else {
				this.analysts = this.analystsBackupData.filter((input) => {
					return input.isSupervisor || input.isAdministrator;
				});
			}
		}
		else {
			this.analysts = JSON.parse(JSON.stringify(this.analystsBackupData));
		}

		let lsUniqueIdInContext = event ? this.appSettingsService.user.lsUniqueId : this.model.assignedToId;
		let preselectAssignTo = this.analystsBackupData.filter((input) => input.value === lsUniqueIdInContext);
	}

	

	public saveFreezeSection() {
		if (this.model.id) {

			let request = new SaveCreditApplicationDetailRequest();
			
			request.creditApplicationDetail = JSON.parse(JSON.stringify(this.model));
			if (this.selectedStatusAssigned)
				request.creditApplicationDetail.statusId = this.selectedStatusAssigned.value;
			else {
				console.log("Unable to save because the status id is null");
				return;
			}
			if (this.selectedAssignTo)
				request.creditApplicationDetail.assignedToId = this.selectedAssignTo.value;
			else {
				console.log("Unable to save because the status id is null");
				return;
			}
			delete request.creditApplicationDetail.originalBilling;
			delete request.creditApplicationDetail.updatedBilling;
			delete request.creditApplicationDetail.originalShipper;
			delete request.creditApplicationDetail.updatedShipper;

			this.creditService.saveCreditApplicationDetail(request).subscribe((result: any) => {
				console.log("Successfully saved Credit Application data");
				let beforeProcessing: CreditApplicationDetail = <CreditApplicationDetail>JSON.parse(JSON.stringify(this.model));
				this.model = this.preProcessCredit(beforeProcessing);
				this.isRefreshParentDashboard = true;
			}, () => {
				console.log("Failed to Save Credit Application data");
			});
		}
		else
			console.log("Unable to save due to invalid application id");
	}

	public refreshSummaryViewOnNewBillToNumber(event: any) {
		if (event && event.target && event.target.value && !Utils.isNumber(event.target.value)) {
			this.isBillToIncorrect = true;
			console.log(`The billTo number ${event.target.value} entered is not a valid number`);
			this.isSave = false;
			return;
		}
		this.isBillToIncorrect = false;
		let beforeProcessing: CreditApplicationDetail = <CreditApplicationDetail>JSON.parse(JSON.stringify(this.model));
		this.model = this.preProcessCreditBillToSection(beforeProcessing);

	}
	public refreshSummaryViewOnNewShipperNumber(event: any) {
		if (event && event.target && event.target.value && !Utils.isNumber(event.target.value)) {
			this.isShipperIncorrect = true;
			console.log(`The shipper number ${event.target.value} entered is not a valid number`);
			this.isSave = false;
			return;
		}
		this.isShipperIncorrect = false;
		let beforeProcessing: CreditApplicationDetail = <CreditApplicationDetail>JSON.parse(JSON.stringify(this.model));
		this.model = this.preProcessCreditShipperSection(beforeProcessing);
	}

	private preProcessCredit(creditDetailClone: CreditApplicationDetail) {
		//Step 1: 
		//if (creditApplicationDetail.shipperNumber != creditApplicationDetail.updatedShipperNumber) {
		//  updatedShipperInfo = customerWebAPI.getCustomerDetail(updatedShipperNumber);
		//}

		//Step 2:
		//if (creditApplicationDetail.billToCustomerNumber != creditApplicationDetail.analystBillToCustomerNumber) {
		//  if (creditApplicationDetail.updatedShipperNumber != creditApplicationDetail.analystBillToCustomerNumber) {
		//    updatedBillToInfo = customerWebAPI.getCustomerDetail(analystBillToCustomerNumber);
		//  }
		//}
		this.preProcessCreditBillToSection(creditDetailClone);
		this.preProcessCreditShipperSection(creditDetailClone);

		return creditDetailClone;
	}

	private evaluateShipperNumber(credit: CreditApplicationDetail) {
		if (!this.isShipperIncorrect)
			this.evaluatedShipperNumber = credit.updatedShipperNumber ? credit.updatedShipperNumber : (credit.shipperNumber || null);
		else
			this.evaluatedBillToNumber = credit.shipperNumber || null;

	}

	private preProcessCreditBillToSection(creditDetailClone: CreditApplicationDetail) {
		creditDetailClone.updatedBilling = creditDetailClone.updatedBilling || new Address();
		creditDetailClone.originalBilling = creditDetailClone.originalBilling || new Address();

		if (creditDetailClone.updatedBillToNumber &&
			(creditDetailClone.billToCustomerNumber !== creditDetailClone.updatedBillToNumber &&
				creditDetailClone.updatedShipperNumber !== creditDetailClone.updatedBillToNumber)) {
			let requestBillingInfo = new GetCustomerDetailRequest();
			requestBillingInfo.customerNumber = creditDetailClone.updatedBillToNumber;


			this.customerService.getCustomerDetail(requestBillingInfo).subscribe((result: GetCustomerDetailResponse) => {

				if (result.errors.hasErrors) {
					this.isBillToIncorrect = true;
					console.log(`The billTo number ${creditDetailClone.updatedBillToNumber} entered is not valid`);
					return;
				}
				else if (result && result.customerDetail) {
					this.isBillToIncorrect = false;
					this.copyCustomerInfoToAddressModel(result.customerDetail, creditDetailClone.updatedBilling);
					this.copyBillingFromDetailToDestination(creditDetailClone.originalBilling, creditDetailClone);
					this.computeFlagLogicForBilling(creditDetailClone);
					this.computeFlagLogicForUpdatedBilling(result.customerDetail)
				}
				else
					console.log(`Get Customer Detail for ${creditDetailClone.updatedBillToNumber} failed`);

			});
		}
		else if ((creditDetailClone.billToCustomerNumber !== creditDetailClone.updatedBillToNumber &&
			creditDetailClone.updatedShipperNumber === creditDetailClone.updatedBillToNumber)) {
			this.isBillToIncorrect = false;
			this.copyBillingFromDetailToDestination(creditDetailClone.originalBilling, creditDetailClone);
			creditDetailClone.updatedShipper = creditDetailClone.updatedBilling;
			this.evaluateBillToNumber(creditDetailClone);
			this.computeFlagLogicForBilling(creditDetailClone);
			this.computeFlagLogicForUpdatedBilling(creditDetailClone)

		}
		else {
			this.isBillToIncorrect = false;
			this.copyBillingFromDetailToDestination(creditDetailClone.updatedBilling, creditDetailClone);
			this.copyBillingFromDetailToDestination(creditDetailClone.originalBilling, creditDetailClone);
			this.evaluateBillToNumber(creditDetailClone);
			this.computeFlagLogicForBilling(creditDetailClone);
			this.computeFlagLogicForUpdatedBilling(creditDetailClone)

		}
		return creditDetailClone;
	}

	private preProcessCreditShipperSection(creditDetailClone: CreditApplicationDetail) {
		creditDetailClone.updatedShipper = creditDetailClone.updatedShipper || new Address();
		creditDetailClone.originalShipper = creditDetailClone.originalShipper || new Address();

		if (creditDetailClone.updatedShipperNumber && (creditDetailClone.shipperNumber !== creditDetailClone.updatedShipperNumber)) {

			let requestShipperInfo = new GetCustomerDetailRequest()
			requestShipperInfo.customerNumber = creditDetailClone.updatedShipperNumber;

			this.customerService.getCustomerDetail(requestShipperInfo).subscribe((result: GetCustomerDetailResponse) => {
				if (result.errors.hasErrors) {
					this.isShipperIncorrect = true;
					console.log(`The shipper number ${creditDetailClone.updatedShipperNumber} entered is not valid`);
					return;
				}
				else if (result && result.customerDetail) {
					this.isShipperIncorrect = false;
					this.copyCustomerInfoToAddressModel(result.customerDetail, this.model.updatedShipper);
					this.copyShipperFromDetailToDestination(creditDetailClone.originalShipper, creditDetailClone);
					this.computeFlagLogicForCustomer(creditDetailClone);
					this.computeFlagLogicForUpdatedCustomer(result.customerDetail)

				}
				else
					console.log(`Get Customer Detail for ${creditDetailClone.updatedShipperNumber} failed`);

			})
		}
		else {
			this.isShipperIncorrect = false;
			this.copyShipperFromDetailToDestination(creditDetailClone.originalShipper, creditDetailClone);
			this.copyShipperFromDetailToDestination(creditDetailClone.updatedShipper, creditDetailClone);
			this.evaluateShipperNumber(creditDetailClone);
			this.computeFlagLogicForCustomer(creditDetailClone);
			this.computeFlagLogicForUpdatedCustomer(creditDetailClone)

		}
		return creditDetailClone;
	}

	private evaluateBillToNumber(credit: CreditApplicationDetail) {
		if (!this.isBillToIncorrect)
			this.evaluatedBillToNumber = credit.updatedBillToNumber ? credit.updatedBillToNumber : (credit.billToCustomerNumber || null);
		else
			this.evaluatedBillToNumber = credit.billToCustomerNumber || null;
	}

	private copyCustomerInfoToAddressModel(source: Customer, destination: Address) {
		if (source) {
			//destination.country = 
			//destination.phoneNumber = source.
			destination.customerName = source.customerName;
			destination.address1 = source.address1;
			destination.address2 = source.address2;
			destination.city = source.city;
			destination.state = source.state;
			destination.zip = source.zipcode;
		}
	}

	private getCountryName(countryCode: string) {
		let mCountry=this.countries.filter(country => country.value == countryCode)
		return mCountry.length > 0 ? mCountry[0].text:''
	}
	private copyShipperFromDetailToDestination(destination: Address, creditResult: CreditApplicationDetail) {
		if (destination) {
			destination.country = this.getCountryName( creditResult.shipperCountryCode)
			destination.phoneNumber = creditResult.shipperContactPhoneNumber;
			destination.customerName = creditResult.shipperName;
			destination.address1 = creditResult.shipperAddress1;
			destination.address2 = creditResult.shipperAddress2;
			destination.city = creditResult.shipperCity;
			destination.state = creditResult.shipperState;
			destination.zip = creditResult.shipperZip;
		}
	}

	private copyBillingFromDetailToDestination(destination: Address, creditResult: CreditApplicationDetail) {
		if (destination) {
			destination.country = this.getCountryName(creditResult.billToCountryCode);
			destination.phoneNumber = creditResult.billToContactPhoneNumber
			destination.customerName = creditResult.billToName;
			destination.address1 = creditResult.billToAddress1;
			destination.address2 = creditResult.billToAddress2;
			destination.city = creditResult.billToCity;
			destination.state = creditResult.billToState;
			destination.zip = creditResult.billToZip;
		}
	}
	//public submit() {
	//  console.log("submit");
	//  this.closeRequest.emit({});
	//}
	computeFlagLogicForCustomer(input: Customer | CreditApplicationDetail) {
		this.shipperFlag = input.shipperFlag ? 'Y' : 'N';
		this.consigneeFlag = input.consigneeFlag ? 'Y' : 'N';
		this.billToFlag = input.billToFlag ? 'Y' : 'N';
		this.defaultBillToNumber = input.billToCustomerNumber;
		//this.customerStatusFlag = input.status;

		if ((<Customer>input).customerNumber)
			this.defaultBillToFlag = (input.billToCustomerNumber === (<Customer>input).customerNumber) ? 'Y' : 'N';
		if ((<CreditApplicationDetail>input).shipperNumber)
			this.defaultBillToFlag = (input.billToCustomerNumber === (<CreditApplicationDetail>input).shipperNumber) ? 'Y' : 'N';
	}

	computeFlagLogicForBilling(input: Customer | CreditApplicationDetail) {
		this.billToFlagBIT = input.billToFlag ? 'Y' : 'N';
		this.defaultBillToNumber = input.billToCustomerNumber;
	}

	computeFlagLogicForUpdatedCustomer(input: Customer | CreditApplicationDetail) {
		// Flags
		this.updatedShipperFlag = input.shipperFlag ? 'Y' : 'N';
		this.updatedConsigneeFlag = input.consigneeFlag ? 'Y' : 'N';
		this.updatedBillToFlag = input.billToFlag ? 'Y' : 'N';
		this.updatedDefaultBillToNumber = input.billToCustomerNumber;

		if ((<Customer>input).customerNumber)
			this.updatedDefaultBillToFlag = (input.billToCustomerNumber === (<Customer>input).customerNumber) ? 'Y' : 'N';
		if ((<CreditApplicationDetail>input).shipperNumber)
			this.updatedDefaultBillToFlag = (input.billToCustomerNumber === (<CreditApplicationDetail>input).shipperNumber) ? 'Y' : 'N';

		// Customer status
		if (input.status) {
			this.updatedCustomerInformationStatus = input.status;
			this.model.updatedShipperCustomerStatus = this.updatedCustomerInformationStatus;
		}
		else {
			this.model.updatedShipperCustomerStatus = (this.model && this.model.shipperCustomerStatus) || null;
			this.updatedCustomerInformationStatus = (this.model && this.model.updatedShipperCustomerStatus) || null;
		}
	}

	computeFlagLogicForUpdatedBilling(input: Customer | CreditApplicationDetail) {
		// Flags
		this.updatedBillToFlagBIT = input.billToFlag ? 'Y' : 'N';
		this.updatedDefaultBillToNumber = input.billToCustomerNumber;

		// Customer status
		if (input.status) {
			this.updatedBillToCustomerStatus = input.status;
			this.model.updatedBillToCustomerStatus = this.updatedBillToCustomerStatus;
		}
		else {
			this.model.updatedBillToCustomerStatus = (this.model && this.model.billToCustomerStatus) || null;
			this.updatedBillToCustomerStatus = (this.model && this.model.billToCustomerStatus) || null;
		}

		// Customers' credit 
		this.availableCredit = input.availableCredit;
		input.availableCredit = this.availableCredit;
		this.creditLimit = input.creditLimit;
		input.creditLimit = this.creditLimit;
	}
}