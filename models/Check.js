const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CheckSchema = new Schema({
    name: {
        type: String,
        validate: {
            validator: {
                validator: (name) => name.length > 2 && name.length < 70,
                message: "The name must be between 2 and 70 characters"
            }
        },
        required: [true, "Name is required"]
    },
    description: {
        type: String,
        validate: {
            validate: {
                validator: (description) => description.length > 2 && name.length < 256,
                message: "The description must be between 2 and 2566 characters"
            }
        },
        required: [true, "A description is required"]
    },
    condition: {
        type: String,
        required: [true, "A condition is required"]
    },
    sqlStatement: String
});

const Check = mongoose.model('Check', CheckSchema);
module.exports = Check;