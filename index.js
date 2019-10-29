
const moment = require('moment')
const path = require('path')
const vega = require('vega')
const fs = require('fs')

const constants = {
  paths: {
    history: './data/history.json',
    graph: './data/graph.png'
  }
}

const readEntries = path => {
  const history = require(path)
  return history['Browser History']
}

const entries = readEntries(constants.paths.history)

const sortGoogleHistory = (entry0, entry1) => {
  return entry0.time_usec - entry1.time_usec
}

const processGoogleHistory = entry => {
  const date = moment(entry.time_usec / 1000)
  return {
    time_usec: entry.time_usec,
    parts: {
      week: parseInt(date.format('w')),
      hour: parseInt(date.format('HH')),
      day: parseInt(date.format('d')),
      month: date.format('MMMM'),
      year: parseInt(date.format('YYYY'))
    }
  }
}

const processSearchHistory = entries => {
  // -- sort by date
  const parsed = entries
    .sort(sortGoogleHistory)
    .map(processGoogleHistory)

  const grouped = {}

  // -- group entries by date
  parsed.forEach(entry => {
    const key = `${entry.parts.week} ${entry.parts.year}`

    if (grouped[key]) {
      grouped[key].count++

      grouped[key].hours.forEach(data => {
        if (entry.parts.hour === data.hour) {
          data.count++
        }
      })

    } else {
      grouped[key] = {
        count: 0,
        hours: []
      }

      for (let ith = 0; ith < 24; ++ith) {
        grouped[key].hours.push({
          hour: ith,
          count: 0
        })
      }

      grouped[key].hours.forEach(data => {
        if (entry.parts.hour === data.hour) {
          data.count++
        }
      })
    }
  })

  const aggregated = []

  Object.keys(grouped).forEach(date => {
    const data = grouped[date]

    data.hours.forEach(hourData => {
      aggregated.push({
        ...hourData,
        date,
        fullDate: moment(date, 'w YYYY').unix()
      })
    })
  })

  return aggregated
}

const getSortedDates = () => {
  // -- some of the worst code I've ever written, but Vega's date formats are just too fiddly.
  const sortedDates = []

  for (let year = 2005; year < 2020; ++year) {
    for (let week = 0; week < 54; ++week) {
      sortedDates.push(`${week} ${year}`)
    }
  }

  return sortedDates
}

const saveGraph = async () => {
  const spec = {
    $schema: 'https://vega.github.io/schema/vega-lite/v4.0.0-beta.9.json',
    data: {
      values: processSearchHistory(entries)
    },
    title: {
      text: 'Google Searches By Hour, Over the Years'
    },
    mark: 'rect',
    config: {},
    width: 800,
    height: 400,
    encoding: {
      y: {
        field: 'hour',
        type: 'ordinal',
        sort: 'descending'
      },
      x: {
        field: "date",
        type: "ordinal",
        sort: getSortedDates()
      },
      color: {
        scale: {
          scheme: 'blues'
        },
        field: 'count',
        type: 'quantitative'
      }
    }
  }

 const view = new vega.View(vega.parse(spec))
    .renderer('none')
    .initialize()

 const canvas = await view.toCanvas()
 const stream = canvas.createPNGStream()
 const out = fs.createWriteStream(constants.paths.graph)
 stream.pipe(out)
}

saveGraph()
