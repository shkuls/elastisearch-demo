const { Client } = require('@elastic/elasticsearch');
const express = require('express');

const esClient = new Client({ node: 'http://localhost:9200' });
const app = express();
app.use(express.json());


async function createIndex() {
    const indexExists = await esClient.indices.exists({ index: 'index' });
    if (!indexExists.body) {
      await esClient.indices.create({
        index: 'index',
        body: {
          mappings: {
            properties: {
              item: { type: 'keyword' },
              search_count: { type: 'integer' },
              last_searched_timestamp: { type: 'date' }
            }
          }
        }
      });
      console.log('index created');
    } else {
      console.log('index already exists');
    }
  }
createIndex();

app.post('/search', async (req, res) => {
    const { item } = req.body;
  
    try {
      await esClient.update({
        index: 'index',
        id: item,
        body: {
          script: {
            source: `
              ctx._source.search_count += 1;
              ctx._source.last_searched_timestamp = params.now;
            `,
            lang: 'painless',
            params: {
              now: new Date().toISOString()
            }
          },
          upsert: {
            search_count: 1,
            last_searched_timestamp: new Date().toISOString(),
            item: item
          }
        }
      });
      res.json({ message: 'Search count and timestamp updated successfully' });
    } catch (error) {
      console.error(error);
      res.json(error);
    }
  });

  app.get('/most-searched', async (req, res) => {
    let limit = 10;
    if(req.query.limit){

        limit = parseInt(req.query.limit);
    }
  
    try {
      const { body } = await esClient.search({
        index: 'index',
        body: {
          size: limit,
          sort: [{ search_count: 'desc' }],
          query: { match_all: {} }
        }
      });
  
      res.json(body);
    } catch (error) {
      console.error(error);
      res.json(error);
    }
  });

  app.get('/recently-searched', async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
  
    try {
      const { body } = await esClient.search({
        index: 'index',
        body: {
          size: limit,
          sort: [{ last_searched_timestamp: 'desc' }],
          query: { match_all: {} }
        }
      });
  
      res.json(body);
    } catch (error) {
      console.error(error);
      res.json(error);
    }
  });
  
  const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


