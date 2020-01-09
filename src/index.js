const axios = require("axios");
const express = require("express");
const cheerio = require("cheerio");
const cors = require("cors")

const app = express()
const port = process.env.PORT || 5000;
import DBManager from "./db"

let db = new DBManager()

app.options('*', cors(), async (req, res) => {
    res.header("Access-Control-Allow-Origin", "*")
    res.header("Access-Control-Allow-Methods", ["POST", "OPTIONS"])
    res.header("Access-Control-Allow-Headers",
        ["Access-Control-Allow-Headers", "Origin", "Accept", "X-Requested-With", "Content-Type", "Access-Control-Request-Method", "Access-Control-Request-Headers"])
    res.send()
})
app.get('/meta_info', cors(), (req, res) => {
    let headers = req.headers
    let request = new Request(headers.user, headers.category, headers.period, headers.rows, headers.cols)
    let out = []
    request.getResponse()
        .then(collage_info => {
            out.push(collage_info)

            const artist_info = collage_info.map(info => info.artist)
            db.find(artist_info, (bios) => {
                const stored_artist_names = bios.map(bio => bio.artist.name)
                let result_bios = artist_info.map((info, i) => {
                    const index = stored_artist_names.indexOf(info.name)
                    if (index > -1) {
                        return new Promise((res, rej) => {
                            res({
                                bio: bios[index],
                                stored: true
                            })
                        })
                    }
                    else {
                        return new Promise(async (res, rej) => {
                            let bio = await fetchData(info.url)
                            res({
                                bio: bio,
                                stored: false
                            })
                        })
                    }
                })
                Promise.all(result_bios).then((bios_complete) => {
                    let result_bios = bios_complete.map(a => a.bio)
                    res.header("test", "test")
                    res.header("Access-Control-Allow-Origin", "*")
                    res.header("Access-Control-Allow-Methods", ["POST", "OPTIONS"])
                    res.header("Access-Control-Allow-Headers",
                        ["Access-Control-Allow-Headers", "Origin", "Accept", "X-Requested-With", "Content-Type", "Access-Control-Request-Method", "Access-Control-Request-Headers"])
                    res.send({ img_arr: result_bios, album_info: out[0] })
                    return bios_complete
                }).then((bios_complete) => {
                    const entries = []
                    bios_complete.forEach((bio, index) => {
                        if (bio.stored === false) {
                            const info = out[0][index]
                            if (bio.bio == undefined) {
                                entries.push({
                                    artist: info.artist,
                                    imgUrl: null,
                                    bioText: null
                                })
                            }
                            else {
                                entries.push({
                                    artist: info.artist,
                                    imgUrl: bio.bio.imgUrl,
                                    bioText: bio.bio.bioText
                                })
                            }
                        }
                    })
                    entries.forEach((entry) => {
                        db.insert(entry)
                    })
                })
            })
        })
})

app.get('/album_info', async (req, res) => {
    let headers = req.headers
    fetchData(headers.artist_url)
        .catch((err) => Promise.reject(err).then(console.log(err)).then(res.send(err)))
        .then(
            (result => res.send(result))
        );

})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))

class Request {
    constructor(user, category, period, rows, cols) {
        this.category_options = {
            albums: "getTopAlbums",
            artists: "getTopArtists",
            tracks: "getTopTracks"
        }

        this.user = user;
        this.category = this.category_options[category];
        this.period = period;
        this.rows = rows;
        this.cols = cols;
        this.limit = rows * cols;
        this.api_key = "57ee3318536b23ee81d6b27e36997cde";
        this.request = `http://ws.audioscrobbler.com/2.0/?method=user.${this.category}&user=${this.user}&api_key=${this.api_key}&format=json&period=${this.period}&limit=${this.limit}`;
    }
    async getResponse() {
        try {
            let r = await axios.post(this.request)
            return r.data.topalbums.album
        } catch (error) {
            console.error(error)
        }
    }

}


async function fetchData(artistUrl) {
    const result = await axios.get(`${artistUrl}/+images/`)

    let $ = cheerio.load(result.data);
    let links = $('.image-list-item-wrapper a img')
    let imgUrl
    if (links[0] != null && links[0].hasOwnProperty("attribs")) {
        imgUrl = links[0].attribs.src
    }
    else {
        imgUrl = null
    }


    const wiki_result = await axios.get(`${artistUrl}/+wiki/`)


    let $$ = cheerio.load(wiki_result.data)
    let bio = $$('.wiki-content p')

    if (typeof bio === "undefined" || bio.length === 0) {
        return
    }
    let bioText = bio[0].children.map(d => {
        if (d.type !== "text") {
            if (d.type === "tag") {
                if (typeof d.children[0] === "undefined") {
                    return `\t`
                }
                return d.children[0].data
            }
            else {
                return d.children[0].data
            }
        }
        else {
            return d.data
        }
    })
    bioText = bioText.reduce((prev, cur) => {
        if (cur !== undefined) {
            return prev + cur
        }
        else {
            return prev
        }
    }, "")

    return {
        imgUrl: imgUrl,
        bioText: bioText
    }
}

//user can choose between small/medium/large/extralarge images
//should be able to place album name, artist name, playcount on image

