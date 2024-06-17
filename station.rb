ref = []
File.open('../station_database/src/station.csv', 'r:utf-8') do |file|
  file.each_line do |line|
    next if line.start_with? 'code'

    cols = line.split ','
    next if cols[13].to_i == 1

    ref << {
      'code' => cols[0].to_i,
      'name' => cols[2],
      'original_name' => cols[3],
      'pref' => cols[7].to_i
    }
  end
end

data = []
File.open('static/map/data/stations.csv', 'r:utf-8') do |file|
  file.each_line do |line|
    next if line.start_with? 'cd'

    cols = line.split ','
    data << {
      'code' => cols[0].to_i,
      'name' => cols[1],
      'lat' => cols[2], # 小数点以下桁数が揃っていないので文字列のまま扱う
      'lng' => cols[3],
      'pref' => cols[4].to_i,
      'prefname' => cols[5],
      'type' => cols[6].to_i
    }
  end
end

prefecture = []
File.open('static/map/data/prefs_ekimemo.csv', 'r:utf-8') do |file|
  file.each_line do |line|
    next if line.start_with? 'pref'

    cols = line.split ','
    prefecture << {
      'code' => cols[0].to_i,
      'name' => cols[1],
      'count' => cols[4].to_i
    }
  end
end

ref.each do |s1|
  next if data.index { |s2| s1['name'] == s2['name'] }

  # 末尾の都道府県名を考慮
  next if prefecture.none? do |p|
    name = p['name']
    name = name[0..-2] if name.end_with?('県', '都', '府')
    s1['name'].end_with? "(#{name})"
  end

  i = data.index { |s2| s1['original_name'] == s2['name'] && s1['pref'] == s2['pref'] }
  next unless i

  data[i]['name'] = s1['name']
end

File.open('static/map/data/stations.csv', 'w:utf-8') do |file|
  file.puts 'cd,name,lat,lng,prefcd,prefname,type'
  data.each do |f|
    line = format(
      '%d,%s,%s,%s,%02d,%s,%d',
      f['code'],
      f['name'],
      f['lat'],
      f['lng'],
      f['pref'],
      f['prefname'],
      f['type']
    )
    file.puts line
  end
end