const axios = require("axios");
const express = require("express");
const cheerio = require("cheerio");
const cors = require("cors")

const app = express()
const port = 3001

app.options('*', cors(), async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*")
    res.set("Access-Control-Allow-Methods", ["POST", "OPTIONS"])
    res.set("Access-Control-Allow-Headers",
        ["Access-Control-Allow-Headers", "Origin", "Accept", "X-Requested-With", "Content-Type", "Access-Control-Request-Method", "Access-Control-Request-Headers"])
    res.send()
})
app.get('/meta_info', cors(), async (req, res) => {
    console.log(req.headers)
    let headers = req.headers
    request = new Request(headers.user, headers.category, headers.period, headers.rows, headers.cols)
    let out = []
    album_info = request.getResponse()
        .then(collage_info => {
            out.push(collage_info)
            return Promise.all(collage_info.map(
                (elm) => {
                    return fetchData(elm.artist.url)
                }))
        })
        .then(d => {
            res.set("test", "test")
            res.set("Access-Control-Allow-Origin", "*")
            res.set("Access-Control-Allow-Methods", ["POST", "OPTIONS"])
            res.set("Access-Control-Allow-Headers",
                ["Access-Control-Allow-Headers", "Origin", "Accept", "X-Requested-With", "Content-Type", "Access-Control-Request-Method", "Access-Control-Request-Headers"])
            res.send({ img_arr: d, album_info: out[0] })
        })

})



//console.log(collage_info.then(d => console.log(d)))
//console.log(await (collage_info))

// .reduce((prev, next) => {
//     prev.push(next)
// }, [])

//console.log(await albumData)


// albumData = await request.map(element => {
//     return fetchData(element.artist.url)
// });
// res.send({
//     albumData,
//     request
// })

app.get('/album_info', async (req, res) => {
    let headers = req.headers
    console.log("headers: ", headers)
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

        this.period_options = {
            overall: "overall",
            seven_day: "7day",
            one_month: "1month",
            three_months: "3month",
            six_months: "6month",
            year: "12month"
        };

        this.user = user;
        this.category = this.category_options[category];
        this.period = period;
        this.rows = rows;
        this.cols = cols;
        this.limit = rows * cols;
        this.api_key = "57ee3318536b23ee81d6b27e36997cde";
        this.request = `http://ws.audioscrobbler.com/2.0/?method=user.${this.category}&user=${this.user}&api_key=${this.api_key}&format=json&period=${this.period}&limit=${this.limit}`;
        console.log(this.request)
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
    let imgUrl = links[0].attribs.src

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

