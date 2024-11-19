export default function sqlToBQ(
    sqlQueries = [
      'SELECT op.startDate AS x_axis, AVG(pem.efficiencyScore) AS y_axis FROM OperationalPlanning op JOIN OperationalEfficiencyMetrics oem ON op.operationalPlanningId = oem.operationalPlanningId JOIN ProcessEfficiencyMeasurements pem ON oem.efficiencyMetricId = pem.efficiencyMetricId GROUP BY op.startDate',
    ],
    schemaIds = [
      {
        schemaId: '670792b1f6719a0a4db18b54',
        name: 'OperationalPlanning',
      },
      {
        schemaId: '670792b1b4751123fdc59205',
        name: 'OperationalEfficiencyMetrics',
      },
      {
        schemaId: '670792b1b4751123fdc59206',
        name: 'ProcessEfficiencyMeasurements',
      },
    ]
  ) {
    // Convert schemaIds array to a mapping of names to schemaIds
    const schemaIdMap = {};
    schemaIds.forEach((item) => {
      schemaIdMap[item.name] = item.schemaId;
    });
  
    const updatedQueries = sqlQueries.map((query) => {
      let tableAliasMap = {};
  
      // Replace table names in FROM and JOIN clauses
      query = query.replace(
        /(FROM|JOIN)\s+(\w+)(\s+(\w+))?/g,
        function (match, p1, p2, p3, p4) {
          // p1: 'FROM' or 'JOIN'
          // p2: table name
          // p4: alias (if any)
  
          let tableName = p2;
          let alias = p4;
  
          if (schemaIdMap[tableName]) {
            let schemaId = schemaIdMap[tableName];
            let newTableName = 't_' + schemaId + '_t';
  
            // Update the tableAliasMap
            if (alias) {
              tableAliasMap[alias] = tableName;
            } else {
              tableAliasMap[tableName] = tableName;
            }
  
            return p1 + ' ' + newTableName + (alias ? ' ' + alias : '');
          } else {
            return match; // No change
          }
        }
      );
  
      // Get list of aliases
      const aliases = Object.keys(tableAliasMap);
  
      if (aliases.length > 0) {
        // Build regex to match alias.columnName
        const aliasRegexStr = aliases.map((alias) => alias).join('|');
        const columnRegex = new RegExp('\\b(' + aliasRegexStr + ')\\.(\\w+)', 'g');
  
        // Replace column names
        query = query.replace(columnRegex, function (match, p1, p2) {
          // p1: alias
          // p2: column name
          return p1 + '.`entity.' + p2 + '`';
        });
      }
  
      return query;
    });
  
    return updatedQueries;
  }
  