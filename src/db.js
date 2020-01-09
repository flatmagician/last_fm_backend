//STOP USING LOKI!!!!!! USE FUCKING NEDB
const Datastore = require("nedb")

export default class DBManager {
    constructor() {
        this.db = new Datastore({ filename: "./db/ArtistInfo.json" })
        this.db.loadDatabase((error) => {
            if (error) {
                console.log('FATAL: local database could not be loaded. Caused by: ' + error);
                throw error;
            }
            console.log('INFO: local database loaded successfully.');
        })
    }

    //object can also be an array
    insert(object) {
        this.db.insert(object)
        console.log("inserting document")
    }

    async find(values, callback) {
        return this.db.find({
            artist: { $in: values }
        }, (err, docs) => {
            if (err) {
                console.error(err)
            }
            else {
                return callback(docs)
            }
        })
    }

    //fn takes obj as a parameter, returns boolean
    where(fn) {
        return this.db.where(fn)
    }
}
