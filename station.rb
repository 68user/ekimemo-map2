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

set = Set.new
data.each do |s2|
  raise "name duplicated #{s2}" unless set.add? s2['name']

  i = ref.index { |s1| s1['name'] == s2['name'] }
  raise "not found #{s2}" unless i
end
