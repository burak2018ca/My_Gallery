//-------------------------------------------------------------------------------------------------------------------------------------------------//

require("dotenv").config();

const path = require("path");
const fsPromises = require("fs").promises;
const { MongoClient } = require('mongodb');
const ObjectId = require('mongodb').ObjectId;

//-------------------------------------------------------------------------------------------------------------------------------------------------//

const resetMongoDB = async () => {
    try {
        const client = await new MongoClient(process.env.A5_MONGODB).connect();
        const db = client.db(process.env.A5_DBNAME);
        const result = await db.dropDatabase();
        console.log("Resetting Database ........... ==> OK");
        await client.close();
        return result;
    } catch (err) {
        console.log(err);
        return err;
    }
}

//-------------------------------------------------------------------------------------------------------------------------------------------------//

const userGet = async (username) => {
    try {
        const client = await new MongoClient(process.env.A5_MONGODB).connect();
        const db = client.db(process.env.A5_DBNAME);
        let filterDb = { Username: username };
        const result = await db.collection("Users").findOne(filterDb);
        await client.close();
        return result;
    } catch (err) {
        console.log(err);
        return err;
    }
}

//-------------------------------------------------------------------------------------------------------------------------------------------------//

const userCreate = async (user) => {
    try {
        const client = await new MongoClient(process.env.A5_MONGODB).connect();
        const db = client.db(process.env.A5_DBNAME);
        const result = await db.collection("Users").insertOne(user);
        await client.close();
        return result;
    } catch (err) {
        console.log(err);
        return err;
    }
}

//-------------------------------------------------------------------------------------------------------------------------------------------------//

const userUpdate = async (user) => {
    try {
        const client = await new MongoClient(process.env.A5_MONGODB).connect();
        const db = client.db(process.env.A5_DBNAME);
        const result = await db.collection("Users").replaceOne({ 'Username': user.Username }, { ...user });
        await client.close();
        return result;
    } catch (err) {
        console.log(err);
        return err;
    }
}

//-------------------------------------------------------------------------------------------------------------------------------------------------//

const userLogin = async (user) => {
    try {
        const client = await new MongoClient(process.env.A5_MONGODB).connect();
        const db = client.db(process.env.A5_DBNAME);
        let filterDb = { Username: user.Username, Password: user.Password };
        const result = await db.collection("Users").findOne(filterDb);
        await client.close();
        return result;
    } catch (err) {
        console.log(err);
        return err;
    }
}

//-------------------------------------------------------------------------------------------------------------------------------------------------//

const getArtworks = async () => {
    try {
        const client = await new MongoClient(process.env.A5_MONGODB).connect();
        const db = client.db(process.env.A5_DBNAME);
        const result = await db.collection("Artworks").find().toArray();
        await client.close();
        return result;
    } catch (err) {
        console.log(err);
        return err;
    }
}

//-------------------------------------------------------------------------------------------------------------------------------------------------//

const getArtworksByArtist = async (filter) => {
    try {
        const client = await new MongoClient(process.env.A5_MONGODB).connect();
        const db = client.db(process.env.A5_DBNAME);
        let filterDb = { Artist: filter };
        const result = await db.collection("Artworks").find(filterDb).toArray();
        await client.close();
        return result;

    } catch (err) {
        console.log(err);
        return err;
    }
}

//-------------------------------------------------------------------------------------------------------------------------------------------------//

const getArtworksByAllFields = async (filter) => {
    try {
        const client = await new MongoClient(process.env.A5_MONGODB).connect();
        const db = client.db(process.env.A5_DBNAME);

        let filterDb = {};

        if (filter.Name != '') filterDb.Name = filter.Name;
        if (filter.Artist != '') filterDb.Artist = filter.Artist;
        if (filter.Category != '') filterDb.Category = filter.Category;
        if (filter.Medium != '') filterDb.Medium   = filter.Medium;

        const result = await db.collection("Artworks").find(filterDb).toArray();
        await client.close();
        return result;
    } 
    catch (err) {
        console.log(err);
        return err;
    }
}

//-------------------------------------------------------------------------------------------------------------------------------------------------//

const getArtwork = async (id) => {
    try {
        const client = await new MongoClient(process.env.A5_MONGODB).connect();
        const db = client.db(process.env.A5_DBNAME);
        const result = await db.collection("Artworks").findOne({ '_id': ObjectId(id) });
        await client.close();
        return result;
    } catch (err) {
        console.log(err);
        return err;
    }
}

//-------------------------------------------------------------------------------------------------------------------------------------------------//

const updateArtwork = async (item) => {
    try {
        const id = item._id;
        delete item._id;
        const client = await new MongoClient(process.env.A5_MONGODB).connect();
        const db = client.db(process.env.A5_DBNAME);
        const result = await db.collection("Artworks").replaceOne({ '_id': ObjectId(id) }, {...item});
        await client.close();
        return result;
    } catch (err) {
        console.log(err); 
        return err;
    }
}

//-------------------------------------------------------------------------------------------------------------------------------------------------//

const addArtwork = async (item) => {
    try {
        const id = item._id;
        delete item._id;
        const client = await new MongoClient(process.env.A5_MONGODB).connect();
        const db = client.db(process.env.A5_DBNAME);
        const result = await db.collection("Artworks").insertOne({...item});
        await client.close();
        return result;
    } catch (err) {
        console.log(err);
        return err;
    }
}

//-------------------------------------------------------------------------------------------------------------------------------------------------//

const deleteArtwork = async (id) => {
    try {
        const client = await new MongoClient(process.env.A5_MONGODB).connect();
        const db = client.db(process.env.A5_DBNAME);
        const result = await db.collection("Artworks").deleteOne({ '_id': ObjectId(id) });
        await client.close();
        return result;
    } catch (err) {
        console.log(err);
        return err;
    }
}

//-------------------------------------------------------------------------------------------------------------------------------------------------//

const readDataAndInitMongoDB = async () => {
    try {

        // ------ Get Data from Json Files ------//

        const galleryData = await fsPromises.readFile(path.join(__dirname, "data", "gallery.json"));
        const galleryJson = await JSON.parse(galleryData);

        //------ Prepare Data for MongoDB Database ------//

        let result = [];

        for(const idx in galleryJson) {

            const item = galleryJson[idx];

            const itemDB = {
                Name: item.name,
                Artist: item.artist,
                Year: parseInt(item.year),
                Category: item.category,
                Medium: item.medium,
                Description: item.description,
                Image: item.image,
                Likes: [],
            }

            result.push(itemDB);
        }

        //------ Load Data for MongoDB Database ------//

        const client = await new MongoClient(process.env.A5_MONGODB).connect();
        console.log("Connection MongoDB ........... ==> OK");

        const db = client.db(process.env.A5_DBNAME);
        console.log("Creating Database ............ ==> OK");

        let countOfArtworks = await db.collection("Artworks").countDocuments();

        if (countOfArtworks == 0) {
            const resultIndex = await db.collection("Artworks").createIndex({ Artist:1, Name:1 }, { unique: true });
            const resultInsert = await db.collection("Artworks").insertMany(result);
            countOfArtworks = await db.collection("Artworks").countDocuments();
            console.log(`Creating Artworks ............ ==> ${resultInsert.acknowledged}`);
            console.log(`Artworks Items Count ......... ==> ${countOfArtworks}`);
            console.log(`Creating Artworks Index ...... ==> ${resultIndex}`);
        }

        //-------------- Create Users --------------//

        let countOfUsers = await db.collection("Users").countDocuments();

        if (countOfUsers == 0) {

            const user = {
                Username: "admin",
                Usertype: "patron",
                Password: "admin",
                Follows: [],
                Likes: [],
            }

            const resultIndex = await db.collection("Users").createIndex({ Username:1 }, { unique: true });
            const resultInsert = await db.collection("Users").insertOne(user);

            countOfUsers = await db.collection("Users").countDocuments();
            console.log(`Creating Users ............... ==> ${resultInsert.acknowledged}`);
            console.log(`Users Items Count ............ ==> ${countOfUsers}`);
            console.log(`Creating Users Index ......... ==> ${resultIndex}`);
        }

        await client.close();
        console.log(`MongoDB Server URL............ ==> ${process.env.A5_MONGODB}`);
        return true;
    } 
    catch (err) {
        console.log(err);
        return err;
    }
}

//-------------------------------------------------------------------------------------------------------------------------------------------------//

module.exports = {
    userGet,
    userLogin,
    userCreate,
    userUpdate,
    addArtwork,
    getArtwork,
    getArtworks, 
    deleteArtwork,
    updateArtwork,
    resetMongoDB,
    getArtworksByArtist,    
    getArtworksByAllFields,    
    readDataAndInitMongoDB,
};

//-------------------------------------------------------------------------------------------------------------------------------------------------//
