const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CheckExecutorConfigSchema = new Schema({
    IDOfLastCheckedPayment: {
        type: Number
    }
});

const CheckExecutorConfig = mongoose.model('checkExecutorConfig', CheckExecutorConfigSchema);
module.exports = CheckExecutorConfig;