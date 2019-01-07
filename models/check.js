const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CheckSchema = new Schema({
    name: {
        type: String,
        validate: {
            validator: (name) => name.length > 2 && name.length < 70,
            message: "The name must be between 2 and 70 characters"
        },
        required: [true, "Name is required"]
    },
    description: {
        type: String,
        validate: {
            validator: (description) => description.length > 2 && description.length < 256,
            message: "The description must be between 2 and 256 characters"
        },
        required: [true, "A description is required"]
    },
    condition: {
        type: String,
        required: [true, "A condition is required"]
    },
    sqlStatement: String,
    sqlID: {
        type: Number
    }
});

CheckSchema.options.toJSON.transform = removeSqlID;

function removeSqlID(doc, ret, options){
    delete ret.sqlID;
    return ret;
}

const Check = mongoose.model('check', CheckSchema);
module.exports = Check;