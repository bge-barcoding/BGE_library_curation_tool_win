const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { parseString } = require('xml2js');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));
app.use(bodyParser.json());

const DATA_FOLDER = path.join(__dirname, 'data');
fs.mkdirSync(path.join(__dirname, 'logs'), { recursive: true });

let db;
let availableColumns = [];
let currentXmlFile = '';
let currentDbFile = '';

// Utility: Get datasets
function getAvailableDatasets() {
    const files = fs.readdirSync(DATA_FOLDER);
    const datasetNames = new Set();

    files.forEach(file => {
        if (file.endsWith('.xml') || file.endsWith('.db')) {
            datasetNames.add(file.replace(/\.(xml|db)$/, ''));
        }
    });

    return [...datasetNames];
}

app.get('/datasets', (req, res) => {
    res.json(getAvailableDatasets());
});

app.post('/switch-dataset', (req, res) => {
    const { dataset } = req.body;
       const xmlPath = path.join(DATA_FOLDER, `${dataset}.xml`);
    const dbPath = path.join(DATA_FOLDER, `${dataset}.db`);

    const dbExists = fs.existsSync(dbPath);
    const xmlExists = fs.existsSync(xmlPath);

    // Return error only if BOTH don't exist
    if (!xmlExists && !dbExists) {
        return res.status(404).send('Dataset not found');
    }

    currentXmlFile = xmlExists ? xmlPath : '';
    currentDbFile = dbPath;

    if (db) db.close();

    db = new sqlite3.Database(currentDbFile, (err) => {
        if (err) {
            console.error('Error opening DB:', err.message);
            return res.status(500).send('Failed to open database');
        }

        console.log(`Switched to dataset: ${dataset}`);

        if (!dbExists && xmlExists) {
            console.log('DB does not exist, initializing from XML...');
            initDatabaseAndLoadData(currentXmlFile, db)
                .then(() => {
                    populateAvailableColumns();
                    res.send('Dataset loaded and DB created from XML');
                })
                .catch(err => {
                    console.error(err);
                    res.status(500).send('Failed to load dataset from XML');
                });
        } else {
            console.log('Using existing DB (XML not required).');
            populateAvailableColumns();
            res.send('Dataset loaded successfully (existing DB)');
        }
    });
});

// Core Function: Load data into SQLite
async function initDatabaseAndLoadData(xmlPath, database) {
    return new Promise((resolve, reject) => {
        fs.readFile(xmlPath, 'utf8', (readErr, xmlData) => {
            if (readErr) return reject(`Error reading XML: ${readErr}`);

            parseString(xmlData, { explicitArray: false }, (parseErr, result) => {
                if (parseErr) return reject(`Error parsing XML: ${parseErr}`);

                const records = Array.isArray(result.records.record)
                    ? result.records.record
                    : [result.records.record];

                database.run(`CREATE TABLE IF NOT EXISTS records (                   
                    url TEXT,                    
                    ranking TEXT,
                    BAGS TEXT,
                    status TEXT,
                    recordid TEXT,
                    taxonid TEXT,
                    processid TEXT PRIMARY KEY,
                    sampleid TEXT,
                    fieldid TEXT,
                    museumid TEXT,
                    record_id TEXT,
                    specimenid TEXT,
                    processid_minted_date TEXT,
                    bin_uri TEXT,
                    bin_created_date TEXT,
                    collection_code TEXT,
                    inst TEXT,
                    taxid TEXT,
                    kingdom TEXT,
                    phylum TEXT,
                    class TEXT,
                    "order" TEXT,
                    family TEXT,
                    subfamily TEXT,
                    tribe TEXT,
                    genus TEXT,
                    species TEXT,
                    subspecies TEXT,
                    species_reference TEXT,
                    identification TEXT,
                    identification_method TEXT,
                    identification_rank TEXT,
                    identified_by TEXT,
                    identifier_email TEXT,
                    taxonomy_notes TEXT,
                    sex TEXT,
                    reproduction TEXT,
                    life_stage TEXT,
                    short_note TEXT,
                    notes TEXT,
                    voucher_type TEXT,
                    tissue_type TEXT,
                    specimen_linkout TEXT,
                    associated_specimens TEXT,
                    associated_taxa TEXT,
                    collectors TEXT,
                    collection_date_start TEXT,
                    collection_date_end TEXT,
                    collection_date_accuracy TEXT,
                    collection_event_id TEXT,
                    collection_time TEXT,
                    collection_notes TEXT,
                    geoid TEXT,
                    country_ocean TEXT,
                    country_iso TEXT,
                    province_state TEXT,
                    region TEXT,
                    sector TEXT,
                    site TEXT,
                    site_code TEXT,
                    coord TEXT,
                    coord_accuracy TEXT,
                    coord_source TEXT,
                    elev TEXT,
                    elev_accuracy TEXT,
                    depth TEXT,
                    depth_accuracy TEXT,
                    habitat TEXT,
                    sampling_protocol TEXT,                    
                    nuc_basecount TEXT,
                    insdc_acs TEXT,
                    funding_src TEXT,
                    marker_code TEXT,                    
                    sequence_run_site TEXT,
                    sequence_upload_date TEXT,
                    recordset_code_arr TEXT,
                    extrainfo TEXT,
                    country TEXT,
                    collection_note TEXT,
                    associated_specimen TEXT,                    
                    nucraw TEXT,                    
                    additionalStatus TEXT,
                    curator_notes TEXT,
                    sumscore,
                    country_representative,
                    haplotype_id,
                    otu_id

                )`, (createErr) => {
                    if (createErr) return reject(`Error creating table: ${createErr}`);

                    const insertStmt = database.prepare(`INSERT OR REPLACE INTO records ( 
                        url, ranking, BAGS, status, recordid, taxonid, processid, sampleid, fieldid, museumid, record_id, specimenid,
                        processid_minted_date, bin_uri, bin_created_date, collection_code, inst, taxid, kingdom, phylum, class, "order",
                        family, subfamily, tribe, genus, species, subspecies, species_reference, identification, identification_method,
                        identification_rank, identified_by, identifier_email, taxonomy_notes, sex, reproduction, life_stage, short_note,
                        notes, voucher_type, tissue_type, specimen_linkout, associated_specimens, associated_taxa, collectors, collection_date_start,
                        collection_date_end, collection_date_accuracy, collection_event_id, collection_time, collection_notes, geoid, country_ocean,
                        country_iso, province_state, region, sector, site, site_code, coord, coord_accuracy, coord_source, elev, elev_accuracy,
                        depth, depth_accuracy, habitat, sampling_protocol, nuc_basecount, insdc_acs, funding_src, marker_code, sequence_run_site, 
                        sequence_upload_date, recordset_code_arr, extrainfo, country, collection_note, associated_specimen, nucraw, curator_notes, additionalStatus,
                        sumscore, country_representative, haplotype_id, otu_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

                    records.forEach(record => {
                        const values = [
                            record.processid ? `https://portal.boldsystems.org/record/${record.processid}` : null,
                            record.ranking, record.BAGS, record.status, record.recordid, record.taxonid, record.processid, record.sampleid,
                            record.fieldid, record.museumid, record.record_id, record.specimenid,
                            record.processid_minted_date, record.bin_uri, record.bin_created_date, record.collection_code, record.inst, record.taxid,
                            record.kingdom, record.phylum, record.class, record["order"], record.family, record.subfamily, record.tribe, record.genus,
                            record.species, record.subspecies, record.species_reference, record.identification, record.identification_method,
                            record.identification_rank, record.identified_by, record.identifier_email, record.taxonomy_notes, record.sex, record.reproduction,
                            record.life_stage, record.short_note, record.notes, record.voucher_type, record.tissue_type, record.specimen_linkout,
                            record.associated_specimens, record.associated_taxa, record.collectors, record.collection_date_start, record.collection_date_end,
                            record.collection_date_accuracy, record.collection_event_id, record.collection_time, record.collection_notes, record.geoid,
                            record.country_ocean, record.country_iso, record.province_state, record.region, record.sector, record.site, record.site_code,
                            record.coord, record.coord_accuracy, record.coord_source, record.elev, record.elev_accuracy, record.depth, record.depth_accuracy,
                            record.habitat, record.sampling_protocol, record.nuc_basecount, record.insdc_acs, record.funding_src,
                            record.marker_code, record.sequence_run_site, record.sequence_upload_date, record.recordset_code_arr, record.extrainfo, record.country, 
                            record.collection_note, record.associated_specimen, record.nucraw, record.curator_notes, record.additionalStatus, record.sumscore, 
                            record.country_representative, record.haplotype_id, record.otu_id
                        ].map(value => typeof value === 'object' ? JSON.stringify(value) : value || null);

                        insertStmt.run(values);
                    });                    
                });
            });
        });
    });
}

function populateAvailableColumns() {
    if (!db) return;

    db.all("PRAGMA table_info(records);", (err, rows) => {
        if (err) {
            console.error("Error fetching columns:", err.message);
        } else {
            availableColumns = rows.map(row => row.name);
            console.log("Available columns:", availableColumns);
        }
    });
}

function writeToLog(processId, action, oldValues, newValues) {
    const timestamp = new Date().toISOString();
    let logMessage = `${timestamp} - Process ID: ${processId}, Action: ${action}\n`;

    Object.keys(oldValues).forEach(key => {
        if (oldValues[key] !== newValues[key]) {
            logMessage += `    ${key}: ${oldValues[key]} -> ${newValues[key]}\n`;
        }
    });

    const logFilePath = path.join(__dirname, 'logs', 'changes.log');
    const backupLogFilePath = path.join(__dirname, 'public', 'ressources', 'backup_changes.log');

    [logFilePath, backupLogFilePath].forEach((filePath) => {
        fs.appendFile(filePath, logMessage, (err) => {
            if (err) console.error(`Error writing to ${filePath}:`, err);
        });
    });
}

// Guarded API endpoints
app.get('/records', (req, res) => {
    if (!db) return res.status(500).send('Database not initialized');

    db.all('SELECT * FROM records', (err, rows) => {
        if (err) {
            console.error('Error fetching records:', err.message);
            res.status(500).send('Error fetching records');
        } else {
            res.json(rows);
        }
    });
});

app.get('/columns', (req, res) => {
    res.json({ availableColumns });
});

// Function to calculate BAGS grading for a species
function calculateBAGSGrade(binCount, recordCount, binSharing, bins) {
    if (binSharing) return 'E'; // BIN-sharing event detected

    if (binCount === 1) {
        if (recordCount > 10) return 'A';
        if (recordCount >= 3) return 'B';
        if (recordCount < 3) return 'D';
    } else {
        // BIN-splitting case: Ensure all bins are exclusive to this species
        const uniqueToSpecies = bins.every(bin => bin.exclusive);
        if (uniqueToSpecies) return 'C';
    }

    return 'E'; // Default to grade E if none of the above conditions match
}
app.post('/generate', (req, res) => {
    let {
        searchTerm,
        searchType,
        searchTerm2,
        searchType2,
        columns,
        includeInvalid,
        start = 0,
        length = 10,
        draw
    } = req.body;

    const allowedColumns = [
        'bin_uri', 'processid', 'identification', 'country_ocean', 'url',
        'ranking', 'sumscore', 'species', 'status', 'class', 'order',
        'family', 'genus', 'subspecies', 'species_reference', 'country_representative'
    ];

    const conditions = [];
    const params = [];

    if (searchTerm && searchType && columns.includes(searchType)) {
        conditions.push(`${searchType} LIKE ?`);
        params.push(`%${searchTerm}%`);
    }

    if (searchTerm2 && searchType2 && columns.includes(searchType2)) {
        conditions.push(`${searchType2} LIKE ?`);
        params.push(`%${searchTerm2}%`);
    }

    if (!includeInvalid) {
        conditions.push(`(status IS NULL OR status NOT IN ('invalid record', 'exclude species'))`);
    }

    const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';

    // const customSort = `
    //     identification COLLATE NOCASE ASC,
    //     CASE WHEN country_representative = 'Yes' THEN 0 ELSE 1 END,
    //     CASE WHEN ranking GLOB '[0-9]*' THEN CAST(ranking AS INTEGER) ELSE 9999 END,
    //     CAST(sumscore AS INTEGER) DESC
    // `;

    //let orderClause = ` ORDER BY ${customSort}`;
    let orderClause = '';

    if (Array.isArray(req.body.order) && req.body.order.length > 0) {
        const userSort = req.body.order
            .map(o => {
                const col = columns[o.column];
                const dir = o.dir === 'desc' ? 'DESC' : 'ASC';
                return allowedColumns.includes(col) ? `${col} ${dir}` : null;
            })
            .filter(Boolean)
            .join(', ');

        if (userSort) {
            orderClause = ` ORDER BY ${userSort}`;
        }
    } else {
        // ✅ Fallback default sort logic
        orderClause = ` ORDER BY 
            identification COLLATE NOCASE ASC,
            CASE WHEN country_representative = 'Yes' THEN 0 ELSE 1 END,
            CAST(sumscore AS INTEGER) DESC`;
    }

    // if (Array.isArray(req.body.order) && req.body.order.length > 0) {
    //     const userSort = req.body.order
    //         .map(o => {
    //             const col = columns[o.column];
    //             const dir = o.dir === 'desc' ? 'DESC' : 'ASC';
    //             return allowedColumns.includes(col) ? `${col} ${dir}` : null;
    //         })
    //         .filter(Boolean)
    //         .join(', ');
    //     if (userSort) orderClause += `, ${userSort}`;
    // }

    db.get(`SELECT COUNT(*) as count FROM records`, [], (err, totalResult) => {
        if (err) return res.status(500).json({ success: false, message: 'Error counting total records' });

        const recordsTotal = totalResult.count;

        db.all(`SELECT * FROM records${whereClause}`, params, (err, allRows) => {
            if (err) return res.status(500).json({ success: false, message: 'Error fetching filtered records' });

            const recordsFiltered = allRows.length;

            const speciesSet = new Set(allRows.map(r => r.species).filter(Boolean));
            const binSet = new Set(allRows.map(r => r.bin_uri).filter(Boolean));
            const curatedCount = allRows.filter(r => r.status).length;
            const uncuratedCount = allRows.length - curatedCount;

            const binSharingMap = {};
            const speciesBinMap = {};

            allRows.forEach(row => {
                if (row.bin_uri) {
                    if (!binSharingMap[row.bin_uri]) binSharingMap[row.bin_uri] = new Set();
                    binSharingMap[row.bin_uri].add(row.species);
                }
                if (row.species) {
                    if (!speciesBinMap[row.species]) speciesBinMap[row.species] = new Set();
                    speciesBinMap[row.species].add(row.bin_uri);
                }
            });

            const binSharingEvents = Object.values(binSharingMap).filter(set => set.size > 1).length;
            const binSplittingEvents = Object.values(speciesBinMap).filter(set => set.size > 1).length;

            const gradeCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
            speciesSet.forEach(species => {
                const bins = speciesBinMap[species] ? Array.from(speciesBinMap[species]) : [];
                const binSharing = bins.some(bin => binSharingMap[bin] && binSharingMap[bin].size > 1);
                const grade = calculateBAGSGrade(
                    bins.length,
                    allRows.filter(r => r.species === species).length,
                    binSharing,
                    bins
                );
                gradeCounts[grade]++;
            });

            const stats = {
                recordCount: allRows.length,
                speciesCount: speciesSet.size,
                binCount: binSet.size,
                curatedCount,
                uncuratedCount,
                binSharingEvents,
                binSplittingEvents,
                gradeCounts
            };

            const paginatedQuery = `
                SELECT * FROM records
                ${whereClause}
                ${orderClause}
                LIMIT ? OFFSET ?
            `;
            const paginatedParams = [...params, parseInt(length), parseInt(start)];

            db.all(paginatedQuery, paginatedParams, (err, paginatedRows) => {
                if (err) return res.status(500).json({ success: false, message: 'Error fetching paginated records' });

                paginatedRows.forEach(item => {
                    const validBins = speciesBinMap[item.species]
                        ? Array.from(speciesBinMap[item.species]).filter(bin => binSharingMap[bin])
                        : [];

                    const sharedSpecies = item.bin_uri && binSharingMap[item.bin_uri]
                        ? Array.from(binSharingMap[item.bin_uri]).filter(species => species && species !== item.species)
                        : [];

                    let binInfo = '';
                    if (sharedSpecies.length > 0) {
                        binInfo += `<b>BIN-sharing:</b> ${sharedSpecies.join(', ')} `;
                    }
                    if (validBins.length > 1) {
                        binInfo += `<b>BIN-splitting:</b> ${validBins.join(', ')}`;
                    } else if (validBins.length === 1) {
                        binInfo += `<b>Single BIN:</b> ${validBins[0]}`;
                    }

                    const binSharing = sharedSpecies.length > 0;
                    const binCount = validBins.length;
                    const recordCount = allRows.filter(r =>
                        r.species === item.species &&
                        (!r.status || (r.status.toLowerCase() !== 'invalid record' && r.status.toLowerCase() !== 'exclude species'))
                    ).length;

                    item.bags = calculateBAGSGrade(binCount, recordCount, binSharing, validBins.map(bin => ({ id: bin, exclusive: !binSharing })));
                    item.bin_info = binInfo.trim();
                });

                const data = paginatedRows.map(row => {
                    return columns.map(col => row[col.toLowerCase()] || '')
                        .concat([
                            row.bags || '', row.bin_info || '', row.status || '',
                            row.additionalStatus || '', row.species || '',
                            row.curator_notes || '', row.processid || ''
                        ]);
                });

                res.json({
                    draw,
                    recordsTotal,
                    recordsFiltered,
                    data,
                    stats
                });
            });
        });
    });
});

// app.post('/submit') endpoint
app.post('/submit', (req, res) => {
    const { processId, status, additionalStatus, species, curator_notes } = req.body;

    // SQL command to get the current values
    const sqlSelect = `SELECT species, identification, status, additionalStatus, curator_notes FROM records WHERE processid = ?`;

    db.get(sqlSelect, [processId], (selectErr, oldData) => {
        if (selectErr) {
            console.error('Error fetching current data from database:', selectErr);
            return res.status(500).json({ success: false, message: 'Error fetching current data from database' });
        }

        const currentSpecies = oldData.species || '';
        const currentIdentification = oldData.identification || ''; // Get identification value
        const currentStatus = oldData.status || '';
        const currentAdditionalStatus = oldData.additionalStatus || '';
        const currentCuratorNotes = oldData.curator_notes || '';

        let changes = { oldValues: {}, newValues: {} };

        // Check for changes in the fields and log them
        if (currentStatus !== status) {
            changes.oldValues.status = currentStatus;
            changes.newValues.status = status;
        }
        if (currentAdditionalStatus !== additionalStatus) {
            changes.oldValues.additionalStatus = currentAdditionalStatus;
            changes.newValues.additionalStatus = additionalStatus;
        }
        if (currentCuratorNotes !== curator_notes) {
            changes.oldValues.curator_notes = currentCuratorNotes;
            changes.newValues.curator_notes = curator_notes;
        }

        function updateRecords() {
            const sqlUpdate = `UPDATE records
                               SET status = ?, additionalStatus = ?, curator_notes = ?
                               WHERE processid = ?`;

            db.run(sqlUpdate, [status, additionalStatus, curator_notes, processId], function(err) {
                if (err) {
                    console.error('Error updating record in database:', err);
                    return res.status(500).json({ success: false, message: 'Error updating record in database' });
                }

                console.log(`Row with Process ID ${processId} updated successfully.`);

                // Log the changes if any
                if (Object.keys(changes.oldValues).length > 0) {
                    writeToLog(processId, 'Updated', changes.oldValues, changes.newValues);
                }
                res.json({ success: true, message: 'Row data updated successfully' });
            });
        }

        // **🔹 Handle "exclude species" logic, but keep "valid record" entries unchanged**
        if (status === 'exclude species') {
            console.log(`Excluding all records with identification: ${currentIdentification}`);

            const sqlSelectAffected = `SELECT processid, status FROM records WHERE identification = ? AND (status IS NULL OR status NOT IN (?))`;
            db.all(sqlSelectAffected, [currentIdentification, 'valid record'], (selectAllErr, rows) => {
                if (selectAllErr) {
                    console.error('Error fetching affected records:', selectAllErr);
                    return res.status(500).json({ success: false, message: 'Error fetching affected records' });
                }

                if (rows.length === 0) {
                    console.log('No records found to update.');
                    return updateRecords();
                }

                // Update all affected records
                const sqlUpdateAll = `UPDATE records SET status = ? WHERE identification = ? AND (status IS NULL OR status NOT IN (?))`;
                db.run(sqlUpdateAll, ['exclude species', currentIdentification, 'valid record'], function(err) {
                    if (err) {
                        console.error('Error updating species in all records:', err);
                        return res.status(500).json({ success: false, message: 'Error updating species in all records' });
                    }

                    console.log(`Updated status to 'exclude species' for applicable records with identification: ${currentIdentification}`);

                    // Log each affected record
                    rows.forEach(row => {
                        const logChanges = {
                            oldValues: { status: row.status || 'uncurated' },
                            newValues: { status: 'exclude species' }
                        };
                        writeToLog(row.processid, 'Updated', logChanges.oldValues, logChanges.newValues);
                    });

                    // Proceed with updating the specific record (log changes)
                    updateRecords();
                });
            });
        }

        // **🔹 Handle "reinclude species" logic (keep "valid record" unchanged)**
        else if (status === 'reinclude species') {
            console.log(`Reincluding all records with identification: ${currentIdentification}`);

            const sqlUpdateAll = `UPDATE records SET status = 'reinclude species' WHERE identification = ? AND (status IS NULL OR status NOT IN (?))`;

            db.run(sqlUpdateAll, [currentIdentification, 'valid record'], function(err) {
                if (err) {
                    console.error('Error reincluding species in all records:', err);
                    return res.status(500).json({ success: false, message: 'Error reincluding species in all records' });
                }

                console.log(`Updated status to 'reinclude species' for applicable records with identification: ${currentIdentification}`);

                const sqlSelectAll = `SELECT processid FROM records WHERE identification = ? AND (status IS NULL OR status NOT IN (?))`;
                db.all(sqlSelectAll, [currentIdentification, 'valid record'], (selectAllErr, rows) => {
                    if (selectAllErr) {
                        console.error('Error fetching updated records:', selectAllErr);
                    } else {
                        rows.forEach(row => {
                            const logChanges = {
                                oldValues: { status: currentStatus },
                                newValues: { status: 'reinclude species' }
                            };
                            writeToLog(row.processid, 'Updated', logChanges.oldValues, logChanges.newValues);
                        });
                    }
                });

                updateRecords();
            });            
        }

        // **🔹 Handle "species name changes" (correct species name, typo, synonym, misidentified, other, empty)**
        else if (species && species.trim() !== currentSpecies) {
            const updatedSpecies = species.trim();
            changes.oldValues.species = currentSpecies;
            changes.newValues.species = updatedSpecies;

            if (additionalStatus === 'typo' || additionalStatus === 'synonym') {
                const sqlSelectAll = `SELECT processid FROM records WHERE species = ?`;
                db.all(sqlSelectAll, [currentSpecies], (selectAllErr, rows) => {
                    if (selectAllErr) {
                        console.error('Error selecting records for update:', selectAllErr);
                        return res.status(500).json({ success: false, message: 'Error selecting records for update' });
                    }
                    if (rows.length > 0) {
                        console.log(`The following records will have their species updated from ${currentSpecies} to ${updatedSpecies}:`);
                        rows.forEach(row => {
                            console.log(`- Process ID: ${row.processid}`);
                        });

                        const sqlUpdateAll = `UPDATE records SET species = ? WHERE species = ?`;
                        db.run(sqlUpdateAll, [updatedSpecies, currentSpecies], function(err) {
                            if (err) {
                                console.error('Error updating species in all records:', err);
                                return res.status(500).json({ success: false, message: 'Error updating species in all records' });
                            }

                            console.log(`Updated species name from ${currentSpecies} to ${updatedSpecies} in all relevant rows.`);

                            rows.forEach(row => {
                                const logChanges = {
                                    oldValues: { species: currentSpecies },
                                    newValues: { species: updatedSpecies }
                                };
                                writeToLog(row.processid, 'Updated', logChanges.oldValues, logChanges.newValues);
                            });

                            updateRecords();
                        });
                    } else {
                        console.log('No records found with the current species name.');
                        res.status(404).json({ success: false, message: 'No records found with the current species name' });
                    }
                });
            } else if (additionalStatus === 'misidentified' || additionalStatus === 'other' || !additionalStatus) {
                const sqlUpdateOne = `UPDATE records SET species = ? WHERE processid = ?`;
                db.run(sqlUpdateOne, [updatedSpecies, processId], function(err) {
                    if (err) {
                        console.error('Error updating species in the specific record:', err);
                        return res.status(500).json({ success: false, message: 'Error updating species in the specific record' });
                    }

                    console.log(`Updated species name from ${currentSpecies} to ${updatedSpecies} for process ID ${processId}`);

                    const logChanges = {
                        oldValues: { species: currentSpecies },
                        newValues: { species: updatedSpecies }
                    };
                    writeToLog(processId, 'Updated', logChanges.oldValues, logChanges.newValues);

                    updateRecords();
                });
            } else {
                updateRecords(true);
            }
        } else {
            // Handle other cases (just update single record)
            updateRecords();
        }      
    });
});
app.post('/search', (req, res) => {
    const { searchTerm, searchType } = req.body;
    let sqlQuery = 'SELECT * FROM records';
    const params = [];
    if (searchTerm && searchType) {
        sqlQuery += ` WHERE ${searchType} LIKE ?`;
        params.push(`%${searchTerm}%`);
    }
    db.all(sqlQuery, params, (err, rows) => {
        if (err) {
            console.error('Error searching records from database:', err);
            return res.status(500).json({ success: false, message: 'Error searching records from database' });
        }
        // Build HTML table for response
        const columns = availableColumns;
        const tableHeaders = columns.map(column => `<th>${column}</th>`).join('');
        const tableRows = rows.map((item, index) => {
            const row = columns.map(column => {
                return `<td id="${column.toLowerCase()}-${index}">${item[column.toLowerCase()] || ''}</td>`;
            }).join('');
            return `
                <tr>
                    ${row}                 
                    <td id="processid-${index}">${item.processid}</td>
                    <td>
                        <select id="status-${index}">
                            <option value="valid record" ${item.status === 'valid record' ? 'selected' : ''}>valid record</option>
                            <option value="invalid record" ${item.status === 'invalid record' ? 'selected' : ''}>invalid record</option>
                            <option value="exclude species" ${item.status === 'exclude species' ? 'selected' : ''}>exclude species</option>
                            <option value="reinclude species" ${item.status === 'reinclude species' ? 'selected' : ''}>reinclude species</option>
                        </select>
                    </td>
                    <td>
                        <select id="additionalStatus-${index}">
                            <option value="other" ${item.additionalStatus === 'other' ? 'selected' : ''}>other</option>                            
                            <option value="misidentified" ${item.additionalStatus === 'misidentified' ? 'selected' : ''}>misidentified</option>
                            <option value="synonym" ${item.additionalStatus === 'synonym' ? 'selected' : ''}>synonym</option>
                            <option value="typo" ${item.additionalStatus === 'typo' ? 'selected' : ''}>typo</option>                            
                        </select>
                    </td>                    
                    <td><input type="text" id="species-${index}" value="${item.species || ''}"></td>
                    <td><input type="text" id="curator_notes-${index}" value="${item.curator_notes || ''}"></td>
                    <td><button class="row-submit-button" onclick="submitRow(event, ${index}, '${item.processid}')">Submit</button></td>
                </tr>`;
        }).join('');
        const table = `
            <table id="dataTable">
                <thead>
                        <tr>
                        ${tableHeaders}                      
                        <th>Process ID</th>
                        <th>Status</th>
                        <th>Reason</th>                        
                        <th>Curator_notes</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <button id="submitAllButton" onclick="submitAllRows()">Submit All on Page</button>
            `;
        res.json({ success: true, table });
    });
});
app.post('/distinct-values', (req, res) => {
    const { column, searchTerm, searchType, searchTerm2, searchType2 } = req.body;
    const { start = 0, length = 100 } = req.body;

    let sqlQuery = `SELECT * FROM records`;
    const params = [];
    const conditions = [];

    // Add search filters
    if (searchTerm && searchType) {
        conditions.push(`${searchType} LIKE ?`);
        params.push(`%${searchTerm}%`);
    }

    if (searchTerm2 && searchType2) {
        conditions.push(`${searchType2} LIKE ?`);
        params.push(`%${searchTerm2}%`);
    }

    // Exclude rows with specific statuses
    conditions.push(`(LOWER(status) NOT IN ('invalid record') OR status IS NULL)`);
    //conditions.push(`(LOWER(status) NOT IN ('invalid record', 'exclude species') OR status IS NULL)`);

    // Add conditions to the query
    if (conditions.length > 0) {
        sqlQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Add pagination AFTER the WHERE clause
    sqlQuery += ` LIMIT ? OFFSET ?`;
    params.push(length);
    params.push(start);

    // Execute query
    db.all(sqlQuery, params, (err, rows) => {
        if (err) {
            console.error('Error fetching data:', err);
            return res.status(500).json({ success: false, message: 'Error fetching data' });
        }

        // Calculate statistics
        const recordCount = rows.length;
        const speciesSet = new Set(rows.map(row => row.species).filter(Boolean));
        const binSet = new Set(rows.map(row => row.bin_uri).filter(Boolean));
        const curatedCount = rows.filter(row => row.status).length;
        const uncuratedCount = recordCount - curatedCount;

        // BIN-sharing and BIN-splitting analysis
        const binSharingMap = {};
        const speciesBinMap = {};
        rows.forEach(row => {
            // BIN-sharing
            if (row.bin_uri) {
                if (!binSharingMap[row.bin_uri]) {
                    binSharingMap[row.bin_uri] = new Set();
                }
                binSharingMap[row.bin_uri].add(row.species);
            }

            // BIN-splitting
            if (row.species) {
                if (!speciesBinMap[row.species]) {
                    speciesBinMap[row.species] = new Set();
                }
                speciesBinMap[row.species].add(row.bin_uri);
            }
        });

        // Count BIN-sharing and BIN-splitting events
        const binSharingEvents = Object.values(binSharingMap).filter(set => set.size > 1).length;
        const binSplittingEvents = Object.values(speciesBinMap).filter(set => set.size > 1).length;        

        // Respond with all statistics
        res.json({
            success: true,
            recordCount,
            speciesCount: speciesSet.size,
            binCount: binSet.size,
            curatedCount,
            uncuratedCount,
            binSharingEvents,
            binSplittingEvents,
            // gradeCounts
        });
    });
});
app.get('/distinct-values', (req, res) => {
    const { column, searchTerm, searchTerm2 } = req.query;
    let sqlQuery = `SELECT COUNT(DISTINCT ${column}) AS count FROM records`;
    const params = [];
    // add first condition
    if (searchTerm) {
        sqlQuery += ` WHERE ${column} LIKE ?`;
        params.push(`%${searchTerm}%`);
    }
    // add second condition if available
    if (searchTerm2) {
        if (params.length > 0) {
            sqlQuery += ` AND ${column} LIKE ?`;
        } else {
            sqlQuery += ` WHERE ${column} LIKE ?`;
        }
        params.push(`%${searchTerm2}%`);
    }
    db.get(sqlQuery, params, (err, row) => {
        if (err) {
            console.error('Error fetching distinct values:', err);
            return res.status(500).json({ success: false, message: 'Error fetching distinct values' });
        }

        res.json({ success: true, count: row.count });
    });
});
app.post('/stopServer', (req, res) => {
    res.json({ success: true, message: 'Server is shutting down' });
    console.log('Server is shutting down.');
    server.close(() => {
        console.log('Server shut down gracefully.');
        process.exit(0);
    });
});
// Start server
const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

process.on('exit', (code) => {
    console.log(`Process exited with code ${code}`);
});
// Close database connection on server shutdown
process.on('SIGINT', () => {
    console.log('Closing database connection.');
    db.close((err) => {
        if (err) {
            return console.error('Error closing database connection:', err.message);
        }
        console.log('Database connection closed.');
        server.close(() => {
            console.log('Server shut down gracefully.');
            process.exit(0);
        });
    });
});
app.post('/download-csv', express.json(), (req, res) => {
    if (!currentDbFile || !fs.existsSync(currentDbFile)) {
        return res.status(500).send('No active database selected or file does not exist.');
    }

    const dbExport = new sqlite3.Database(currentDbFile, sqlite3.OPEN_READONLY, (err) => {
        if (err) {
            console.error('Error opening database for export:', err);
            return res.status(500).send('Failed to open current database.');
        }
    });

    const query = 'SELECT * FROM records';

    dbExport.all(query, (err, rows) => {
        if (err) {
            dbExport.close();
            console.error('Error querying records:', err);
            return res.status(500).send('Failed to query database.');
        }

        if (!rows.length) {
            dbExport.close();
            return res.status(200).send('No records found.');
        }

        // Step 1: Collect all keys across all rows
        const allKeys = Array.from(new Set(rows.flatMap(row => Object.keys(row))));

        // Step 2: Config
        const excluded = new Set(['BAGS']);
        const renamed = {
            'additionalStatus': 'reason name correction',
            'species': 'correct species name',
            'curator_notes': 'curator notes',
            'sampleid' : 'sample_id',
            'species_reference' : 'authorship'
        };

        // Step 3: Define default CSV columns in required order
        const requiredFields = [
            { db: 'bin_uri', csv: 'bin_uri' },
            { db: 'processid', csv: 'processid' },
            { db: 'identification', csv: 'identification' },
            { db: 'status', csv: 'status' },
            { db: 'additionalStatus', csv: 'reason name correction' },
            { db: 'species', csv: 'correct species name' },
            { db: 'curator_notes', csv: 'curator notes' },
            { db: 'selected records', csv: 'selected records' }  // special field, computed manually
        ];

        // Step 4: Get user-selected columns or fallback
        let selected = req.body.columns;
        if (!Array.isArray(selected)) selected = [];

        if (selected.length === 0) {
            // Use all other available columns except required and excluded ones
            selected = allKeys.filter(k =>
                !excluded.has(k) &&
                !requiredFields.some(rf => rf.db === k)
            );
        }

        // Step 5: Clean selected list (strip out excluded + required fields)
        selected = selected.filter(h =>
            !excluded.has(h) &&
            !requiredFields.some(rf => rf.db === h || rf.csv === h)
        );

        // Step 6: Add required fields first in order
        const inserted = new Set();
        const finalHeaders = [];

        for (const { db, csv } of requiredFields) {
            if (db === 'selected records' || allKeys.includes(db)) {
                finalHeaders.push(csv);
                inserted.add(csv);
            }
        }

        // Step 7: Add the rest (user-selected or fallback), with renaming
        for (const h of selected) {
            const renamedH = renamed[h] || h;
            if (!inserted.has(renamedH)) {
                finalHeaders.push(renamedH);
                inserted.add(renamedH);
            }
        }

        const csvRows = [
            finalHeaders.join(','),
            ...rows.map(row => {
                return finalHeaders.map(header => {
                    if (header === 'selected records') {
                        const status = (row['status'] || '').toLowerCase();
                        const rep = (row['country_representative'] || '').toLowerCase();
                        const processid = row['processid'];

                        const isSelected =
                            (rep === 'yes' && (!status || status === '')) ||
                            (rep === 'no' && status === 'valid record') ||
                            (rep === 'yes' && status === 'valid record');

                        return isSelected ? JSON.stringify(processid) : '""';
                    }

                    const originalKey = Object.entries(renamed).find(([, val]) => val === header)?.[0] || header;
                    return JSON.stringify(row[originalKey] ?? '');
                }).join(',');
            })
        ];

        res.setHeader('Content-Disposition', 'attachment; filename=taxonomic_records.csv');
        res.setHeader('Content-Type', 'text/csv');
        res.status(200).send(csvRows.join('\n'));

        dbExport.close();
    });
});
