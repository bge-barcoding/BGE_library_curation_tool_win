const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { parseString } = require('xml2js');
const { Builder } = require('xml2js');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const PORT = 3000;
app.use(express.json());
app.use(express.static('public'));
app.use(bodyParser.json());
let db;
let availableColumns = [];
const xmlFile = path.join(__dirname, 'data.xml');
const dbFile = path.join(__dirname, 'data.db');
const logFilePath = path.join(__dirname, 'logfile.txt');
// Function to write data to XML file
function writeToXML(data) {
    const xmlBuilder = new Builder();
    const xmlData = xmlBuilder.buildObject({ records: { record: data } });

    fs.writeFile('output.xml', xmlData, 'utf8', (err) => {
        if (err) {
            console.error('Error writing to XML file:', err);
        } else {
            console.log('Data written to XML file successfully.');
        }
    });
}
// Function to write to log file with detailed changes
function writeToLog(processId, action, oldValues, newValues) {
    const timestamp = new Date().toISOString();
    let logMessage = `${timestamp} - Process ID: ${processId}, Action: ${action}\n`;

    // Add old and new values for changed columns
    Object.keys(oldValues).forEach(key => {
        if (oldValues[key] !== newValues[key]) {
            logMessage += `    ${key}: ${oldValues[key]} -> ${newValues[key]}\n`;
        }
    });
    fs.appendFile(logFilePath, logMessage, (err) => {
        if (err) {
            console.error('Error writing to logfile:', err);
        } else {
            console.log('Log entry added:', logMessage.trim());
        }
    });
}
// Initialize SQLite database and load data from XML
function initDatabaseAndLoadData() {
    if (fs.existsSync('data.db')) {
        console.log('Database file already exists. Skipping initialization.');
        db = new sqlite3.Database(dbFile, (err) => {
            if (err) {
                console.error('Error connecting to existing database:', err.message);
            } else {
                console.log('Successfully connected to the existing database.');
                populateAvailableColumns(); // Load column names
                // Test the connection by querying a table
                db.all("SELECT name FROM sqlite_master WHERE type='table';", (err, rows) => {
                    if (err) {
                        console.error('Error querying database tables:', err.message);
                    } else {
                        console.log('Tables in the database:', rows);
                    }
                });
            }
        });
        return;
    }
    db = new sqlite3.Database(dbFile);

    // Create table if it does not exist
    db.run(`CREATE TABLE IF NOT EXISTS records (
        url TEXT,
        keep TEXT,
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
        collection_date TEXT,
        collection_date_accuracy TEXT,
        collection_event_id TEXT,
        collection_time TEXT,
        collection_notes TEXT,
        geoid TEXT,
        country_ocean TEXT,
        country_iso TEXT,
        province TEXT,
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
        nuc TEXT,
        nuc_basecount TEXT,
        insdc_acs TEXT,
        funding_src TEXT,
        marker_code TEXT,
        primers_forward TEXT,
        primers_reverse TEXT,
        sequence_run_site TEXT,
        sequence_upload_date TEXT,
        recordset_code_arr TEXT,
        extrainfo TEXT,
        country TEXT,
        collection_note TEXT,
        associated_specimen TEXT,
        gb_acs TEXT,
        nucraw TEXT,
        SPECIES_ID TEXT,
        TYPE_SPECIMEN TEXT,
        SEQ_QUALITY TEXT,
        HAS_IMAGE TEXT,
        COLLECTORS TEXT,
        IDENTIFIER TEXT,
        ID_METHOD TEXT,
        INSTITUTION TEXT,
        PUBLIC_VOUCHER TEXT,
        MUSEUM_ID TEXT,
        additionalStatus TEXT,
        curator_notes TEXT
    )`, (err) => {
        if (err) {
            console.error('Error creating table:', err);
            return;
        }
        //db.run(`ALTER TABLE records ADD COLUMN additionalStatus TEXT`);
        // Read data from XML file and insert into SQLite database
        fs.readFile(xmlFile, 'utf8', (err, xmlData) => {
            if (err) {
                console.error('Error reading XML file:', err);
                return;
            }
            parseString(xmlData, { explicitArray: false }, (parseErr, result) => {
                if (parseErr) {
                    console.error('Error parsing XML:', parseErr);
                    return;
                }
                if (result && result.records && result.records.record) {
                    const data = Array.isArray(result.records.record) ? result.records.record : [result.records.record];

                    // Insert data into SQLite database
                    const stmt = db.prepare(`INSERT OR REPLACE INTO records (
                        url, keep, ranking, BAGS, status, recordid, taxonid, processid, sampleid, fieldid, museumid, record_id, specimenid,
                        processid_minted_date, bin_uri, bin_created_date, collection_code, inst, taxid, kingdom, phylum, class, "order",
                        family, subfamily, tribe, genus, species, subspecies, species_reference, identification, identification_method,
                        identification_rank, identified_by, identifier_email, taxonomy_notes, sex, reproduction, life_stage, short_note,
                        notes, voucher_type, tissue_type, specimen_linkout, associated_specimens, associated_taxa, collection_date,
                        collection_date_accuracy, collection_event_id, collection_time, collection_notes, geoid, country_ocean,
                        country_iso, province, region, sector, site, site_code, coord, coord_accuracy, coord_source, elev, elev_accuracy,
                        depth, depth_accuracy, habitat, sampling_protocol, nuc, nuc_basecount, insdc_acs, funding_src, marker_code,
                        primers_forward, primers_reverse, sequence_run_site, sequence_upload_date, recordset_code_arr, extrainfo, country,
                        collection_note, associated_specimen, gb_acs, nucraw, SPECIES_ID, TYPE_SPECIMEN, SEQ_QUALITY, HAS_IMAGE, COLLECTORS,
                        IDENTIFIER, ID_METHOD, INSTITUTION, PUBLIC_VOUCHER, MUSEUM_ID, curator_notes
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
                    
                    data.forEach(record => {
                        const url = record.processid ? `https://portal.boldsystems.org/record/${record.processid}` : null;

                        stmt.run(
                            url, record.keep, record.ranking, record.BAGS, record.status, record.recordid, record.taxonid, record.processid,
                            record.sampleid, record.fieldid, record.museumid, record.record_id, record.specimenid, record.processid_minted_date,
                            record.bin_uri, record.bin_created_date, record.collection_code, record.inst, record.taxid, record.kingdom,
                            record.phylum, record.class, record.order, record.family, record.subfamily, record.tribe, record.genus,
                            record.species, record.subspecies, record.species_reference, record.identification, record.identification_method,
                            record.identification_rank, record.identified_by, record.identifier_email, record.taxonomy_notes, record.sex,
                            record.reproduction, record.life_stage, record.short_note, record.notes, record.voucher_type, record.tissue_type,
                            record.specimen_linkout, record.associated_specimens, record.associated_taxa, record.collection_date,
                            record.collection_date_accuracy, record.collection_event_id, record.collection_time, record.collection_notes,
                            record.geoid, record.country_ocean, record.country_iso, record.province, record.region, record.sector, record.site,
                            record.site_code, record.coord, record.coord_accuracy, record.coord_source, record.elev, record.elev_accuracy,
                            record.depth, record.depth_accuracy, record.habitat, record.sampling_protocol, record.nuc, record.nuc_basecount,
                            record.insdc_acs, record.funding_src, record.marker_code, record.primers_forward, record.primers_reverse,
                            record.sequence_run_site, record.sequence_upload_date, record.recordset_code_arr, record.extrainfo, record.country,
                            record.collection_note, record.associated_specimen, record.gb_acs, record.nucraw, record.SPECIES_ID, record.TYPE_SPECIMEN,
                            record.SEQ_QUALITY, record.HAS_IMAGE, record.COLLECTORS, record.IDENTIFIER, record.ID_METHOD, record.INSTITUTION,
                            record.PUBLIC_VOUCHER, record.MUSEUM_ID, record.curator_notes
                        );
                    });
                    stmt.finalize();

                    // Set available columns for filtering
                    availableColumns = Object.keys(data[0]);
                    console.log('Data loaded from XML and inserted into SQLite database.');
                } else {
                    console.error('Invalid XML structure.');
                }
            });
        });
    });
}

function populateAvailableColumns() {
    db.all("PRAGMA table_info(records);", (err, rows) => {
        if (err) {
            console.error("Error fetching column info:", err.message);
        } else {
            availableColumns = rows.map(row => row.name); // Extract column names
            console.log("Available columns:", availableColumns);
        }
    });
}

// Initialize database and load data on server start
initDatabaseAndLoadData();
// API endpoints
app.get('/records', (req, res) => {
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
    const { searchTerm, searchType, searchTerm2, searchType2, columns } = req.body;

    if (!columns || !Array.isArray(columns)) {
        return res.status(400).json({ success: false, message: 'Invalid columns data' });
    }

    // SQL query base
    let sqlQuery = 'SELECT * FROM records';
    const params = [];
    const conditions = [];

    // Add first query condition
    if (searchTerm && searchType && columns.includes(searchType)) {
        conditions.push(`${searchType} LIKE ?`);
        params.push(`%${searchTerm}%`);
    }

    // Add second query condition
    if (searchTerm2 && searchType2 && columns.includes(searchType2)) {
        conditions.push(`${searchType2} LIKE ?`);
        params.push(`%${searchTerm2}%`);
    }

    // Combine all conditions (no filtering out invalid records here)
    if (conditions.length > 0) {
        sqlQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

    // Execute the SQL query
    db.all(sqlQuery, params, (err, rows) => {
        if (err) {
            console.error('Error fetching records from database:', err);
            return res.status(500).json({ success: false, message: 'Error fetching records from database' });
        }

        // Analyze BIN-sharing and BIN-splitting for valid records only
        const binSharingMap = {};
        const speciesBinMap = {};

        rows.forEach(row => {
            if (row.status && (row.status.toLowerCase() === 'invalid' || row.status.toLowerCase() === 'not in europe')) {
                return; // Skip invalid rows for BIN analysis
            }

            // BIN-sharing: Group species by bin_uri
            if (row.bin_uri) {
                if (!binSharingMap[row.bin_uri]) {
                    binSharingMap[row.bin_uri] = new Set();
                }
                binSharingMap[row.bin_uri].add(row.species);
            }

            // BIN-splitting: Group bin_uri by species
            if (row.species) {
                if (!speciesBinMap[row.species]) {
                    speciesBinMap[row.species] = new Set();
                }
                speciesBinMap[row.species].add(row.bin_uri);
            }
        });

        // Generate HTML table headers
        const tableHeaders = columns.map(column => `<th>${column}</th>`).join('') + '<th>BAGS</th><th>BIN Info</th>';

        // Generate HTML table rows
        const tableRows = rows.map((item, index) => {
            // Construct BIN Info only for valid records
            const validBins = speciesBinMap[item.species]
                ? Array.from(speciesBinMap[item.species]).filter(bin => binSharingMap[bin])
                : [];
            const sharedSpecies = item.bin_uri && binSharingMap[item.bin_uri]
                ? Array.from(binSharingMap[item.bin_uri]).filter(species => species && species !== item.species)
                : [];

            let binInfo = '';
            if (sharedSpecies.length > 0) {
                binInfo += `<b>BIN-sharing:</b> ${sharedSpecies.join(', ')}. `;
            }
            if (validBins.length > 1) {
                binInfo += `<b>BIN-splitting:</b> ${validBins.join(', ')}.`;
            } else if (validBins.length === 1) {
                binInfo += `<b>Single BIN:</b> ${validBins[0]}.`;
            }

            // Calculate BAGS grade only for valid records
            const binSharing = sharedSpecies.length > 0;
            const binCount = validBins.length;
            const recordCount = rows.filter(row => row.species === item.species && (!row.status || row.status.toLowerCase() !== 'invalid')).length;
            const BAGS = calculateBAGSGrade(binCount, recordCount, binSharing, validBins.map(bin => ({ id: bin, exclusive: !binSharing })));

            // Generate row HTML (include all records)
            const row = columns.map(column => {
                return `<td id="${column.toLowerCase()}-${index}">${item[column.toLowerCase()] || ''}</td>`;
            }).join('');
            return `
                <tr class="${item.status && item.status.toLowerCase() === 'invalid' ? 'invalid-record' : ''}">
                    ${row}
                    <td>${item.status && item.status.toLowerCase() === 'invalid' ? '' : BAGS}</td>
                    <td>${item.status && item.status.toLowerCase() === 'invalid' ? '' : binInfo.trim()}</td>
                    <td><a href="${item.url}" target="_blank">Link</a></td>
                    <td id="processid-${index}">${item.processid || ''}</td>
                    <td>${item.country_ocean || ''}</td>
                    <td>${item.ranking || ''}</td>
                    <td>
                        <select id="status-${index}">
                            <option value="" ${!item.status ? 'selected' : ''}></option>
                            <option value="valid" ${item.status === 'valid' ? 'selected' : ''}>Valid</option>
                            <option value="invalid" ${item.status === 'invalid' ? 'selected' : ''}>Invalid</option>
                            <option value="not in europe" ${item.status === 'not in europe' ? 'selected' : ''}>Not in Europe</option>
                        </select>
                    </td>
                    <td>
                        <select id="additionalStatus-${index}">
                            <option value="" ${!item.additionalStatus ? 'selected' : ''}></option>
                            <option value="misidentified" ${item.additionalStatus === 'misidentified' ? 'selected' : ''}>misidentified</option>
                            <option value="synonym" ${item.additionalStatus === 'synonym' ? 'selected' : ''}>Synonym</option>
                            <option value="typo" ${item.additionalStatus === 'typo' ? 'selected' : ''}>typo</option>
                        </select>
                    </td>
                    <td><input type="text" id="species-${index}" value="${item.species || ''}"></td>
                    <td><input type="text" id="curator_notes-${index}" value="${item.curator_notes || ''}"></td>
                    <td><button onclick="submitRow(event, ${index}, '${item.processid || ''}')">Submit</button></td>
                </tr>`;
        }).join('');

        // Final table
        const table = `
            <table id="dataTable">
                <thead>
                    <tr>
                        ${tableHeaders}
                        <th>url</th>
                        <th>Process ID</th>
                        <th>Country_ocean</th>
                        <th>Ranking</th>
                        <th>Status</th>
                        <th>Reason name correction</th>
                        <th>Correct species name</th>
                        <th>Curator_notes</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>`;

        res.json({ success: true, table });
    });
});
// app.post('/submit') endpoint
app.post('/submit', (req, res) => {
    const { processId, status, additionalStatus, species, curator_notes } = req.body;

    // SQL command to get the current values
    const sqlSelect = `SELECT species, status, additionalStatus, curator_notes FROM records WHERE processid = ?`;
    db.get(sqlSelect, [processId], (selectErr, oldData) => {
        if (selectErr) {
            console.error('Error fetching current data from database:', selectErr);
            return res.status(500).json({ success: false, message: 'Error fetching current data from database' });
        }

        const currentSpecies = oldData.species || '';
        const currentStatus = oldData.status || '';
        const currentAdditionalStatus = oldData.additionalStatus || '';
        const currentCurator_notes = oldData.curator_notes || '';

        let changes = {
            oldValues: {},
            newValues: {}
        }; // Object to track what has changed

        // Function to update status, additionalStatus, curator_notes, and species
        function updateOtherFields(updateSpecies = false) {
            if (status !== currentStatus) {
                changes.oldValues.status = currentStatus;
                changes.newValues.status = status;
            }
            if (additionalStatus !== currentAdditionalStatus) {
                changes.oldValues.additionalStatus = currentAdditionalStatus;
                changes.newValues.additionalStatus = additionalStatus;
            }
            if (curator_notes !== currentCurator_notes) {
                changes.oldValues.curator_notes = currentCurator_notes;
                changes.newValues.curator_notes = curator_notes;
            }

            // SQL to update the fields for the specific processId
            const sqlUpdate = `UPDATE records
                               SET status = ?,
                                   additionalStatus = ?,
                                   curator_notes = ?
                                   ${updateSpecies ? ', species = ?' : ''}
                               WHERE processid = ?`;

            const params = updateSpecies
                ? [status, additionalStatus, curator_notes, species, processId]
                : [status, additionalStatus, curator_notes, processId];

            db.run(sqlUpdate, params, function(err) {
                if (err) {
                    console.error('Error updating record in database:', err);
                    return res.status(500).json({ success: false, message: 'Error updating record in database' });
                }
                console.log(`Row with Process ID ${processId} updated successfully.`);
                if (Object.keys(changes.oldValues).length > 0) {
                    writeToLog(processId, 'Updated', changes.oldValues, changes.newValues);
                }
                res.json({ success: true, message: 'Row data updated successfully' });
            });
        }

        // Check if species has changed
        if (species && species.trim() !== currentSpecies) {
            const updatedSpecies = species.trim();
            changes.oldValues.species = currentSpecies;
            changes.newValues.species = updatedSpecies;

            // Update species for all records only if additionalStatus is 'typo' or 'synonym'
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

                            // Log each affected record
                            rows.forEach(row => {
                                const logChanges = {
                                    oldValues: { species: currentSpecies },
                                    newValues: { species: updatedSpecies }
                                };
                                writeToLog(row.processid, 'Updated', logChanges.oldValues, logChanges.newValues);
                            });    

                            updateOtherFields();
                        });
                    } else {
                        console.log('No records found with the current species name.');
                        res.status(404).json({ success: false, message: 'No records found with the current species name' });
                    }
                });
            } else {
                // Update only the specific record for other additionalStatus values
                updateOtherFields(true);
            }
        } else {
            // Proceed with updating the status, additionalStatus if species hasn't changed
            updateOtherFields();
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
                            <option value="valid" ${item.status === 'valid' ? 'selected' : ''}>Valid</option>
                            <option value="invalid" ${item.status === 'invalid' ? 'selected' : ''}>Invalid</option>
                            <option value="not in europe" ${item.status === 'not in europe' ? 'selected' : ''}>Not in Europe</option>
                        </select>
                    </td>
                    <td>
                        <select id="additionalStatus-${index}">
                            <option value="misidentified" ${item.additionalStatus === 'misidentified' ? 'selected' : ''}>misidentified</option>
                            <option value="synonym" ${item.additionalStatus === 'synonym' ? 'selected' : ''}>Synonym</option>
                            <option value="typo" ${item.additionalStatus === 'typo' ? 'selected' : ''}>typo</option>
                        </select>
                    </td>                    
                    <td><input type="text" id="species-${index}" value="${item.species || ''}"></td>
                    <td><input type="text" id="curator_notes-${index}" value="${item.curator_notes || ''}"></td>
                    <td><button onclick="submitRow(event, ${index}, '${item.processid}')">Submit</button></td>
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
            </table>`;
        res.json({ success: true, table });
    });
});
app.post('/distinct-values', (req, res) => {
    const { column, searchTerm, searchType, searchTerm2, searchType2 } = req.body;

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
    conditions.push(`(LOWER(status) NOT IN ('invalid', 'not in europe') OR status IS NULL)`);

    // Add conditions to the query
    if (conditions.length > 0) {
        sqlQuery += ` WHERE ${conditions.join(' AND ')}`;
    }

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

        // BAGS Grade statistics
        const gradeCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };
        speciesSet.forEach(species => {
            const binCount = speciesBinMap[species] ? speciesBinMap[species].size : 0;
            const recordCount = rows.filter(row => row.species === species).length;
            const binSharing = Object.values(binSharingMap).some(set => set.has(species) && set.size > 1);

            const grade = calculateBAGSGrade(binCount, recordCount, binSharing, Array.from(speciesBinMap[species] || []));
            gradeCounts[grade]++;
        });

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
            gradeCounts
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
