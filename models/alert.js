class Alert {
    constructor(AlertCreatedOn, MerchantAmount, Currency, PaymentMethod, BuyerName, MerchantName, OrganizationName, MCC) {
        this.createdOn = AlertCreatedOn;
        this.merchantAmount = MerchantAmount;
        this.currency = Currency;
        this.paymentMethod = PaymentMethod;
        this.buyerName = BuyerName;
        this.merchantName = MerchantName;
        this.organizationName = OrganizationName;
        this.mcc = MCC;
    }
}
module.exports = Alert;